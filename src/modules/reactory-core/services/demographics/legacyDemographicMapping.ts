import type { IDemographicDefinition } from '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition';

/**
 * ORG-040: legacy demographics -> ORG-003 definition/value mapping.
 *
 * This module is the one place that answers "which new definition does this
 * legacy field belong to, and what does the legacy value mean in the new
 * model?". Both consumers share it:
 *
 *  - the `demographics-legacy-migrate` CLI (backfill of legacy data), and
 *  - `services/ETL/Processors/UserDemographicsProcessors.ts` (retargeted off
 *    the retired legacy GraphQL resolvers).
 *
 * ---------------------------------------------------------------------------
 * The eight legacy `OrganizationDemographicsSettings` booleans
 * ---------------------------------------------------------------------------
 *
 * `age` maps to `dateOfBirth`, deliberately **not** to `ageBand`:
 *
 *  - `PersonalDemographic` stores `dob` (a date); there is no legacy age-band
 *    value anywhere. `dateOfBirth` is the definition the migrated values are
 *    actually written to, so enabling `dateOfBirth` is what "this organization
 *    collects age" means after the migration.
 *  - `ageBand` is a derived reporting bucket (`baseDemographicTemplates` calls it
 *    "the non-identifying alternative to date of birth"). Enabling it from a
 *    legacy `age` flag would switch on a definition the migration writes
 *    nothing to and would leave the collected data behind a disabled precise
 *    definition - the opposite of the legacy intent.
 *  - If an organization later wants age bands, it seeds/enables `ageBand` from
 *    the configuration UI; the two flags are independent from then on.
 *
 * There is intentionally no fallback from `dateOfBirth` to `ageBand` when the
 * `dateOfBirth` definition is missing: one legacy field maps to exactly one
 * definition so the dry-run report can state precisely what is unmigratable.
 * The other seven map 1:1 (`teams` -> `team` because the definition key is
 * singular).
 */

/** One legacy boolean settings flag and the definition it enables. */
export interface ILegacySettingMapping {
  legacyField:
    | 'age'
    | 'gender'
    | 'race'
    | 'region'
    | 'position'
    | 'operationalGroup'
    | 'businessUnit'
    | 'teams';
  definitionKey: string;
  note?: string;
}

/**
 * The eight booleans of `OrganizationDemographicsSettings`, in the schema's
 * declaration order. `age` -> `dateOfBirth` is documented in the module note.
 */
export const LEGACY_SETTINGS_DEFINITION_MAP: ReadonlyArray<ILegacySettingMapping> = [
  { legacyField: 'age', definitionKey: 'dateOfBirth' },
  { legacyField: 'gender', definitionKey: 'gender' },
  { legacyField: 'race', definitionKey: 'race' },
  { legacyField: 'region', definitionKey: 'region' },
  { legacyField: 'position', definitionKey: 'position' },
  { legacyField: 'operationalGroup', definitionKey: 'operationalGroup' },
  { legacyField: 'businessUnit', definitionKey: 'businessUnit' },
  { legacyField: 'teams', definitionKey: 'team' },
];

/**
 * The value-bearing fields of `PersonalDemographic`. Every one of them maps to
 * a definition of the base template set (ORG-030).
 */
export interface ILegacyValueFieldMapping {
  legacyField:
    | 'race'
    | 'dob'
    | 'gender'
    | 'pronoun'
    | 'position'
    | 'region'
    | 'operationalGroup'
    | 'businessUnit'
    | 'team';
  definitionKey: string;
}

export const LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS: ReadonlyArray<ILegacyValueFieldMapping> = [
  { legacyField: 'race', definitionKey: 'race' },
  { legacyField: 'dob', definitionKey: 'dateOfBirth' },
  { legacyField: 'gender', definitionKey: 'gender' },
  { legacyField: 'pronoun', definitionKey: 'pronoun' },
  { legacyField: 'position', definitionKey: 'position' },
  { legacyField: 'region', definitionKey: 'region' },
  { legacyField: 'operationalGroup', definitionKey: 'operationalGroup' },
  { legacyField: 'businessUnit', definitionKey: 'businessUnit' },
  { legacyField: 'team', definitionKey: 'team' },
];

/**
 * The value-bearing fields of `UserDemographics`. `UserDemographics` holds the
 * same structural refs as `PersonalDemographic` plus gender/race/position/
 * operationalGroup refs to the *old* `Demographic` collection, but it has no
 * `dob` and no `pronoun`. The migration only uses a `UserDemographics` value
 * when the equivalent `PersonalDemographic` field did not produce a writable
 * value (see `legacyDemographicsMigration`).
 */
export const LEGACY_USER_DEMOGRAPHIC_FIELDS: ReadonlyArray<ILegacyValueFieldMapping> = [
  { legacyField: 'gender', definitionKey: 'gender' },
  { legacyField: 'race', definitionKey: 'race' },
  { legacyField: 'position', definitionKey: 'position' },
  { legacyField: 'operationalGroup', definitionKey: 'operationalGroup' },
  { legacyField: 'region', definitionKey: 'region' },
  { legacyField: 'businessUnit', definitionKey: 'businessUnit' },
  { legacyField: 'team', definitionKey: 'team' },
];

/**
 * Fields whose `UserDemographics` column is an ObjectId ref to the legacy
 * `Demographic` collection (type/key/title) rather than a literal value.
 *
 * `PersonalDemographic` stores the same four fields as literals (operationalGroup
 * as an opaque structural id), so this only applies to `UserDemographics`.
 */
export const LEGACY_DEMOGRAPHIC_REFERENCE_FIELDS: ReadonlyArray<string> = [
  'gender',
  'race',
  'position',
  'operationalGroup',
];

/**
 * Explicit synonyms, applied to the normalised token. Deliberately tiny:
 * only unambiguous abbreviations are translated. Anything else is reported as
 * an unmapped value so an operator decides, rather than the migration silently
 * reinterpreting a person's protected characteristic.
 */
export const LEGACY_ENUM_ALIASES: Record<string, Record<string, string>> = {
  gender: {
    m: 'male',
    man: 'male',
    f: 'female',
    woman: 'female',
    nonbinary: 'non-binary',
    'non-binary': 'non-binary',
  },
  pronoun: {
    'she-her': 'she-her',
    'he-him': 'he-him',
    'they-them': 'they-them',
  },
};

const HEX_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/** True for a 24-hex id, a BSON ObjectId or a document carrying `_id`. */
export const isLegacyId = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return HEX_OBJECT_ID.test(value.trim());
  if (typeof value === 'object') {
    const candidate = value as { toHexString?: unknown; _id?: unknown };
    if (typeof candidate.toHexString === 'function') return true;
    if (candidate._id !== undefined) return isLegacyId(candidate._id);
  }
  return false;
};

/** Normalises any accepted id representation to its hex/string form. */
export const legacyIdString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'object') {
    const candidate = value as { toHexString?: () => string; _id?: unknown };
    if (typeof candidate.toHexString === 'function') return candidate.toHexString();
    if (candidate._id !== undefined) return legacyIdString(candidate._id);
  }
  return null;
};

/**
 * Lower-cases and slugifies a legacy token so `Prefer not to say`,
 * `prefer_not_to_say` and `prefer-not-to-say` all reach the same option key.
 */
export const normalizeLegacyToken = (value: unknown): string =>
  `${value}`
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Splits a legacy multi-value string on the separators the import files used. */
export const splitLegacyTokens = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((entry) => `${entry}`);
  if (typeof value === 'string') {
    const parts = value.split(/[,;|]/).map((part) => part.trim()).filter((part) => part.length > 0);
    return parts.length > 0 ? parts : [];
  }
  return [];
};

interface IEnumOption {
  key: string;
  normalizedKey: string;
  normalizedLabel: string | null;
}

const readOptions = (definition: Partial<IDemographicDefinition> | any): IEnumOption[] => {
  const options = Array.isArray(definition?.options) ? definition.options : [];
  return options
    .filter((option: any) => option && typeof option.key === 'string')
    .map((option: any) => ({
      key: `${option.key}`.trim().toLowerCase(),
      normalizedKey: normalizeLegacyToken(option.key),
      normalizedLabel: typeof option.label === 'string' && option.label.trim().length > 0
        ? normalizeLegacyToken(option.label)
        : null,
    }));
};

/**
 * Resolves one legacy token against a definition's option list.
 *
 * Matching order: exact key, normalised key, alias, normalised label. The label
 * pass is what makes `She / her` and `Prefer not to say` land on `she-her` and
 * `prefer-not-to-say` without a hand-maintained synonym for every label.
 */
const resolveEnumOption = (
  definitionKey: string,
  token: string,
  options: IEnumOption[],
): string | null => {
  const normalized = normalizeLegacyToken(token);
  if (normalized.length === 0) return null;

  const exact = options.find((option) => option.key === normalized || option.normalizedKey === normalized);
  if (exact) return exact.key;

  const alias = LEGACY_ENUM_ALIASES[`${definitionKey}`.toLowerCase()]?.[normalized];
  if (alias) {
    const aliased = options.find((option) => option.key === alias || option.normalizedKey === alias);
    if (aliased) return aliased.key;
  }

  const byLabel = options.find((option) => option.normalizedLabel !== null && option.normalizedLabel === normalized);
  if (byLabel) return byLabel.key;

  return null;
};

export type ILegacyValueMappingReason = 'empty-value' | 'unmapped-value';

export interface ILegacyValueMappingResult {
  ok: boolean;
  value?: unknown;
  reason?: ILegacyValueMappingReason;
  /** Human readable explanation for the dry-run report. */
  detail?: string;
}

/**
 * Translates one legacy value into the value shape `validateDemographicValue`
 * expects for `definition`.
 *
 * It deliberately does **not** validate: an unparseable date or a malformed
 * reference id is passed through unchanged so the validator produces the
 * canonical `invalid-value` error (with its path and message) instead of this
 * mapper inventing a parallel error vocabulary. The only refusals here are
 * `empty-value` and `unmapped-value` (a token that is not an option of an
 * enum/multi-enum definition), because those cannot be expressed as a value at
 * all.
 */
export const mapLegacyValue = (
  definition: Partial<IDemographicDefinition> | any,
  rawValue: unknown,
): ILegacyValueMappingResult => {
  if (rawValue === null || rawValue === undefined) {
    return { ok: false, reason: 'empty-value', detail: 'No value' };
  }

  if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
    return { ok: false, reason: 'empty-value', detail: 'Blank string' };
  }

  const valueType = typeof definition?.valueType === 'string' ? definition.valueType : 'string';
  const definitionKey = `${definition?.key || ''}`.toLowerCase();

  switch (valueType) {
    case 'enum':
    case 'multi-enum': {
      const options = readOptions(definition);
      const tokens = splitLegacyTokens(rawValue);
      if (tokens.length === 0) {
        return { ok: false, reason: 'empty-value', detail: 'No tokens to map' };
      }

      const resolved: string[] = [];
      const unmapped: string[] = [];

      tokens.forEach((token) => {
        const option = resolveEnumOption(definitionKey, token, options);
        if (option === null) unmapped.push(token);
        else if (resolved.indexOf(option) < 0) resolved.push(option);
      });

      if (unmapped.length > 0) {
        return {
          ok: false,
          reason: 'unmapped-value',
          detail: `No option matches ${unmapped.map((token) => `'${token}'`).join(', ')}; allowed: ${
            options.map((option) => option.key).join(', ') || '(none)'
          }`,
        };
      }

      if (definition?.multiValued === true) return { ok: true, value: resolved };

      if (resolved.length > 1) {
        return {
          ok: false,
          reason: 'unmapped-value',
          detail: `Multiple values [${resolved.join(', ')}] for a single-valued definition`,
        };
      }

      return { ok: true, value: resolved[0] };
    }

    case 'date': {
      const parsed = rawValue instanceof Date ? rawValue : new Date(`${rawValue}`);
      // An unparseable date is handed to the validator verbatim so the report
      // carries its standard `Value must be a valid date` message.
      return { ok: true, value: Number.isNaN(parsed.getTime()) ? rawValue : parsed };
    }

    case 'reference': {
      const id = legacyIdString(rawValue) || rawValue;
      return { ok: true, value: id };
    }

    case 'string': {
      if (typeof rawValue === 'object' && rawValue !== null) {
        const candidate = rawValue as { title?: unknown; name?: unknown; key?: unknown };
        const text = candidate.title ?? candidate.name ?? candidate.key;
        if (text === null || text === undefined) {
          return { ok: false, reason: 'unmapped-value', detail: 'Object value has no title, name or key' };
        }
        return { ok: true, value: `${text}`.trim() };
      }
      return { ok: true, value: `${rawValue}`.trim() };
    }

    default:
      return { ok: true, value: rawValue };
  }
};

export default mapLegacyValue;
