/**
 * Planning for the repair of a stored database connection setting.
 *
 * Why this exists
 * ---------------
 * `settings.ts` seeds `reactory.mongodb.connection` into `reactory_clients` when
 * the client document is first created. Changing the default in code therefore
 * does nothing for an install that already has the document, and the stored
 * value can be wrong in a way that is invisible: this environment's setting named
 * database `reactory` (0 collections) while the server ran against
 * `reactory-reactory` (92 collections), with empty credentials and no
 * `authSource`. The macro therefore failed twice over - wrong database, then
 * authentication - and the sanctioned tool was unusable.
 *
 * This module is deliberately pure: it decides *what* should change and why, and
 * leaves reading and writing to the CLI in `scripts/ops/`. That split is what
 * makes the safety rules - idempotency, refusal to clobber an operator override,
 * secret redaction - testable without a database.
 *
 * Safety rules
 * ------------
 *  1. Idempotent. A setting that already matches the environment is a no-op.
 *  2. Never silently overwrite a deliberate override. Only the historical
 *     default shape is repaired automatically; anything else is refused unless
 *     the operator passes `--force`.
 *  3. Never echo a secret. `redactConnectionData` masks the password before the
 *     value reaches a log, a plan or a report.
 */

/** The connection fields this repair understands. Extra keys are preserved untouched. */
export interface ConnectionData {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  options?: Record<string, any>;
  [key: string]: any;
}

export interface RepairTarget {
  settingName: string;
  /** The connection the deployment's environment says the server uses. */
  desired: ConnectionData;
}

export type RepairDecision =
  /** Stored value already matches the environment; nothing to do. */
  | 'already-correct'
  /** Stored value is the known historical default; safe to write the target. */
  | 'repair-stale-default'
  /** Data already matches the environment; only the declared variant spelling changes. */
  | 'normalise-variant'
  /** Stored value is something else entirely and --force was given. */
  | 'replace-override'
  /** Stored value looks deliberately configured; refused. */
  | 'refuse-override';

export interface RepairPlan {
  settingName: string;
  decision: RepairDecision;
  /** Fields that differ between stored and desired, excluding the variant. */
  changedFields: string[];
  /** Redacted view of what is stored now. */
  current: ConnectionData | null;
  /** Redacted view of what would be written. */
  desired: ConnectionData;
  /** Set when the declared variant is a non-canonical alias for the canonical one. */
  normalisedVariant?: { from: string; to: string };
  /** Operator-facing one-liner: what happened and why. */
  reason: string;
}

export interface PlanOptions {
  /** Overwrite a value that is not the historical default. */
  force?: boolean;
  /**
   * Leave the declared variant untouched. By default a known alias is rewritten
   * to its canonical spelling so the setting is usable by the macro that is
   * deployed today.
   */
  keepVariant?: boolean;
}

/**
 * The default `settings.ts` shipped for years: `REACTORY_MONGO_DB || 'reactory'`
 * with no credentials resolved. A setting that still looks exactly like this was
 * never configured, so replacing it is a repair rather than an override.
 */
export const HISTORICAL_MONGO_DEFAULT: Readonly<ConnectionData> = Object.freeze({
  host: 'localhost',
  port: 27017,
  username: '',
  password: '',
  database: 'reactory',
});

/**
 * Canonical spelling for the variant aliases this setting can hold.
 *
 * Deliberately a local map rather than an import from the reactor module: this
 * module must build and run against a checkout that predates the module's alias
 * table, and the server must not hard-depend on an unpublished module branch.
 * The canonical set is owned by `reactory-reactor/ai/macro/data/variants.ts`;
 * this is the subset a connection *setting* can legitimately declare.
 */
export const CANONICAL_SETTING_VARIANTS: Readonly<Record<string, string>> = Object.freeze({
  mongodb: 'mongo',
  postgresql: 'postgres',
  sqlserver: 'mssql',
});

const SECRET_FIELDS = ['password'];

/** Mask secrets so a plan, a log line or a report can be pasted anywhere. */
export const redactConnectionData = (data?: ConnectionData | null): ConnectionData | null => {
  if (!data || typeof data !== 'object') return null;

  const copy: ConnectionData = { ...data };

  SECRET_FIELDS.filter((field) => field in copy).forEach((field) => {
    const value = copy[field];
    copy[field] = typeof value === 'string' && value.length > 0 ? '<redacted>' : '';
  });

  return copy;
};

const hasOptions = (data: ConnectionData): boolean => {
  return !!data.options && Object.keys(data.options).length > 0;
};

/** True when the stored value is byte-for-byte the shape the old default produced. */
export const isHistoricalMongoDefault = (data?: ConnectionData | null): boolean => {
  if (!data || typeof data !== 'object') return false;
  if (hasOptions(data)) return false;

  return (
    data.host === HISTORICAL_MONGO_DEFAULT.host
    && Number(data.port) === HISTORICAL_MONGO_DEFAULT.port
    && (data.username ?? '') === HISTORICAL_MONGO_DEFAULT.username
    && (data.password ?? '') === HISTORICAL_MONGO_DEFAULT.password
    && data.database === HISTORICAL_MONGO_DEFAULT.database
  );
};

const sameOptions = (a?: Record<string, any>, b?: Record<string, any>): boolean => {
  const left = a ?? {};
  const right = b ?? {};
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
};

const COMPARED_FIELDS: Array<keyof ConnectionData> = ['host', 'port', 'username', 'password', 'database'];

/**
 * Fields whose stored value differs from the target. `options` is compared
 * separately because it is an object; the variant is reported on its own.
 */
export const diffConnectionData = (stored: ConnectionData, desired: ConnectionData): string[] => {
  const value = (data: ConnectionData, field: keyof ConnectionData): string | number => (field === 'port' ? Number(data[field]) : (data[field] ?? ''));

  const changed = COMPARED_FIELDS.filter(
    (field) => value(stored, field) !== value(desired, field),
  ).map((field) => field as string);

  if (!sameOptions(stored.options, desired.options)) changed.push('options');

  return changed;
};

const canonicalVariant = (variant?: string): string | undefined => {
  if (typeof variant !== 'string') return undefined;
  const key = variant.trim().toLowerCase();
  if (key.length === 0) return undefined;
  return CANONICAL_SETTING_VARIANTS[key] ?? key;
};

/**
 * Decide what to do with one stored connection setting.
 *
 * Pure: no I/O, no environment reads. The caller supplies the stored value and
 * the target derived from the deployment environment.
 */
export const planConnectionSettingRepair = (
  stored: ConnectionData | null,
  target: RepairTarget,
  options: PlanOptions = {},
): RepairPlan => {
  const { settingName, desired } = target;
  const { force = false, keepVariant = false } = options;

  const redactedDesired = redactConnectionData(desired) as ConnectionData;

  if (!stored) {
    return {
      settingName,
      decision: 'refuse-override',
      changedFields: [],
      current: null,
      desired: redactedDesired,
      reason: `Setting '${settingName}' is not present on the client document; refusing to create it from a repair tool. Seed the client config instead.`,
    };
  }

  const changedFields = diffConnectionData(stored, desired);

  const declaredVariant = typeof stored.variant === 'string' ? stored.variant : undefined;
  const canonical = declaredVariant
    ? (canonicalVariant(declaredVariant) ?? declaredVariant)
    : undefined;

  const nextVariant = (() => {
    if (!declaredVariant) return desired.variant as string | undefined;
    return keepVariant ? declaredVariant : canonical;
  })();

  const normalisedVariant = declaredVariant && nextVariant && nextVariant !== declaredVariant
    ? { from: declaredVariant, to: nextVariant }
    : undefined;

  const variantChangePending = !!normalisedVariant;

  if (changedFields.length === 0 && !variantChangePending) {
    return {
      settingName,
      decision: 'already-correct',
      changedFields: [],
      current: redactConnectionData(stored),
      desired: redactedDesired,
      reason: `Setting '${settingName}' already matches the deployment environment; nothing written.`,
    };
  }

  // Nothing to repair in the data and no override to protect: the only change is
  // the spelling of the variant, which is safe to canonicalise.
  if (changedFields.length === 0 && variantChangePending) {
    return {
      settingName,
      decision: 'normalise-variant',
      changedFields: [],
      current: redactConnectionData(stored),
      desired: redactedDesired,
      normalisedVariant,
      reason:
        `Setting '${settingName}' already matches the deployment environment; rewriting the variant`
        + ` from '${normalisedVariant?.from}' to '${normalisedVariant?.to}'.`,
    };
  }

  const looksDefault = isHistoricalMongoDefault(stored);

  if (!looksDefault && !force) {
    return {
      settingName,
      decision: 'refuse-override',
      changedFields,
      current: redactConnectionData(stored),
      desired: redactedDesired,
      normalisedVariant,
      reason:
        `Setting '${settingName}' does not match the historical default, so it may be a deliberate`
        + ' operator override. Refusing to overwrite it; re-run with --force if the value is known to be wrong.',
    };
  }

  return {
    settingName,
    decision: looksDefault ? 'repair-stale-default' : 'replace-override',
    changedFields,
    current: redactConnectionData(stored),
    desired: redactedDesired,
    normalisedVariant,
    reason: looksDefault
      ? `Setting '${settingName}' still holds the historical default and will be repointed at the database the server uses.`
      : `Setting '${settingName}' will be overwritten because --force was given.`,
  };
};

/** True when the plan has writes to apply. */
export const planMutates = (plan: RepairPlan): boolean => plan.decision === 'repair-stale-default'
  || plan.decision === 'replace-override'
  || plan.decision === 'normalise-variant';
