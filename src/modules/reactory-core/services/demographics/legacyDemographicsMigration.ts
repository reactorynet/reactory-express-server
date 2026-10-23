import validateDemographicValue from '@reactory/server-modules/reactory-core/utils/validateDemographicValue';
import {
  LEGACY_DEMOGRAPHIC_REFERENCE_FIELDS,
  LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS,
  LEGACY_SETTINGS_DEFINITION_MAP,
  LEGACY_USER_DEMOGRAPHIC_FIELDS,
  isLegacyId,
  legacyIdString,
  mapLegacyValue,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicMapping';
import type {
  ILegacySettingMapping,
  ILegacyValueFieldMapping,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicMapping';

/**
 * ORG-040: legacy demographics -> `DemographicValue` / definition enablement.
 *
 * The engine is deliberately database-free: it reads through
 * `ILegacyDemographicsSource`, writes through `ILegacyMigrationTarget`, and
 * reports what it did. The Mongo-backed source and the `DemographicsService`
 * target live in `legacyDemographicsMongoSource.ts`; tests drive the engine with
 * in-memory fakes, which is also why every rule below is exercisable without a
 * live database.
 *
 * ---------------------------------------------------------------------------
 * Organization resolution (the hard part)
 * ---------------------------------------------------------------------------
 *
 * `PersonalDemographic` has no organization column, but `DemographicValue`
 * requires one. The rule implemented here is:
 *
 *  1. Take the user's **embedded memberships** (`User.memberships`) that carry a
 *     non-null, valid `organizationId` and are not disabled.
 *  2. A membership with `organizationId: null` is a *client-wide* membership,
 *     not an organization membership. It is ignored. Treating it as "the
 *     organization" would attribute personal data to a tenant the person does
 *     not belong to, which is exactly the failure mode this rule exists to
 *     prevent.
 *  3. If exactly one distinct organization remains, that is the organization.
 *     Business-unit memberships count (they still carry an organization) and the
 *     org-level membership is preferred when recording `membership`.
 *  4. If zero remain, the record is reported as `no-organization`.
 *  5. If more than one remains, the record is reported as
 *     `ambiguous-organization` with the candidate ids. **Nothing is written.**
 *     Guessing here would silently attribute a value to the wrong tenant, and a
 *     wrong attribution is worse than a skipped row: the operator can see the
 *     candidates and fix the memberships, but cannot detect a wrong write later.
 *
 * `UserDemographics` carries its own `organization` column, so that value wins
 * when it is present and valid; only when it is absent do the membership rules
 * above apply. The report counts both cases.
 *
 * ---------------------------------------------------------------------------
 * Idempotency
 * ---------------------------------------------------------------------------
 *
 * `DemographicValue` is unique on `(organization, definition, user)`. The engine
 * reads the existing values for the involved organizations/users before
 * planning and:
 *  - an identical existing value is skipped as `existing` (never rewritten);
 *  - a different existing value is skipped as `existing-differs` unless
 *    `overwrite: true` was explicitly requested.
 *
 * A second run therefore reports `written: 0`. That holds for enablement too:
 * the legacy boolean is compared with the definition's current `enabled` flag
 * and only a difference is applied.
 *
 * ---------------------------------------------------------------------------
 * Reference values
 * ---------------------------------------------------------------------------
 *
 * `region`, `businessUnit`, `team` and `operationalGroup` are `reference`
 * definitions. `validateDemographicValue` only checks the *shape* of an id, so
 * this engine additionally asks the source whether the referenced record exists;
 * a dangling id is reported as `dangling-reference` and is never written.
 *
 * `PersonalDemographic.operationalGroup` is the trap: its schema says
 * `ref: 'Organization'`, which is wrong for a field that feeds an
 * `OperationalGroup` reference definition. The stored id is treated as opaque
 * and is accepted if it exists in `OperationalGroup` (the definition's target)
 * **or** in `Organization` (the legacy schema's target). Which collection
 * matched is counted in `referenceChecks` and called out in the report notes.
 * `UserDemographics.operationalGroup` is a legacy `Demographic` reference, so it
 * is resolved to its title and then to an `OperationalGroup` by title; if no
 * operational group matches, the value is reported as `unmapped-value`.
 */

export type LegacyMigrationSourceName = 'PersonalDemographic' | 'UserDemographics';

export const LEGACY_PERSONAL_SOURCE: LegacyMigrationSourceName = 'PersonalDemographic';
export const LEGACY_USER_SOURCE: LegacyMigrationSourceName = 'UserDemographics';

/** A legacy `PersonalDemographic` document (only the fields this engine reads). */
export interface ILegacyPersonalDemographicRecord {
  _id?: any;
  userId?: any;
  race?: unknown;
  dob?: unknown;
  gender?: unknown;
  pronoun?: unknown;
  position?: unknown;
  region?: unknown;
  operationalGroup?: unknown;
  businessUnit?: unknown;
  team?: unknown;
}

/** A legacy `UserDemographics` document (only the fields this engine reads). */
export interface ILegacyUserDemographicRecord {
  _id?: any;
  user?: any;
  membership?: any;
  organization?: any;
  gender?: unknown;
  race?: unknown;
  position?: unknown;
  operationalGroup?: unknown;
  region?: unknown;
  businessUnit?: unknown;
  team?: unknown;
}

/** A legacy `OrganizationDemographicsSettings` document. */
export interface ILegacyOrganizationSettingsRecord {
  _id?: any;
  organization?: any;
  age?: boolean;
  gender?: boolean;
  race?: boolean;
  region?: boolean;
  position?: boolean;
  operationalGroup?: boolean;
  businessUnit?: boolean;
  teams?: boolean;
  deleted?: boolean;
}

/** One embedded membership of a user (`User.memberships[n]`). */
export interface ILegacyMembershipRecord {
  _id?: any;
  clientId?: any;
  organizationId?: any;
  businessUnitId?: any;
  enabled?: boolean;
  roles?: string[];
}

export interface ILegacyUserMemberships {
  userId: string;
  memberships: ILegacyMembershipRecord[];
}

/** An existing `DemographicValue` the engine compares against. */
export interface ILegacyExistingValue {
  organization: any;
  user: any;
  key: string;
  value?: unknown;
}

/** A document of the legacy `Demographic` collection, used to decode refs. */
export interface ILegacyDemographicReference {
  _id?: any;
  type?: string;
  key?: string;
  title?: string;
}

/**
 * The read side of the migration. Every method is optional except the three the
 * engine cannot work without, so tests can provide only what a case needs.
 */
export interface ILegacyDemographicsSource {
  listPersonalDemographics?(): Promise<ILegacyPersonalDemographicRecord[]>;
  listUserDemographics?(): Promise<ILegacyUserDemographicRecord[]>;
  listOrganizationSettings?(): Promise<ILegacyOrganizationSettingsRecord[]>;
  listUserMemberships(userIds: string[]): Promise<ILegacyUserMemberships[]>;
  /** Active *and* soft-deleted definitions for these organizations. */
  listDefinitions(organizationIds: string[]): Promise<any[]>;
  listExistingValues(organizationIds: string[], userIds: string[]): Promise<ILegacyExistingValue[]>;
  listLegacyDemographicReferences?(ids: string[]): Promise<ILegacyDemographicReference[]>;
  findOperationalGroupByTitle?(title: string): Promise<{ _id?: any } | null>;
  referenceExists(model: string, id: string): Promise<boolean>;
}

/** One value handed to the writer, matching `IDemographicValueInput`. */
export interface ILegacyMigrationValueInput {
  user: string;
  key: string;
  value: unknown;
  source: 'import';
  verified: false;
  membership?: string | null;
}

/** The write side of the migration (implemented over `DemographicsService`). */
export interface ILegacyMigrationTarget {
  writeValues(organizationId: string, values: ILegacyMigrationValueInput[]): Promise<any>;
  setEnabled(organizationId: string, key: string, enabled: boolean): Promise<any>;
}

export type LegacyMigrationSkipReason =
  | 'no-organization'
  | 'ambiguous-organization'
  | 'missing-user'
  | 'missing-definition'
  | 'unmapped-value'
  | 'invalid-value'
  | 'dangling-reference'
  | 'existing'
  | 'existing-differs'
  | 'superseded'
  | 'write-failed';

export interface ILegacyMigrationSkip {
  source: LegacyMigrationSourceName;
  sourceId?: string;
  userId?: string;
  organizationId?: string;
  key: string;
  field?: string;
  reason: LegacyMigrationSkipReason;
  detail?: string;
  path?: string;
  message?: string;
  value?: unknown;
}

export interface ILegacyUnresolvedRecord {
  source: LegacyMigrationSourceName;
  sourceId?: string;
  userId?: string;
  reason: 'no-organization' | 'ambiguous-organization' | 'missing-user';
  detail: string;
  candidates?: string[];
  fields: string[];
}

export interface ILegacyMigrationDefinitionCount {
  key: string;
  /** Legacy fields that carried a value (blank/null fields are not counted). */
  present: number;
  /** Rows written by this run (in a dry run: rows that *would* be written). */
  written: number;
  skipped: number;
  /** Skip counts by reason. Every key is always present, zero when unused. */
  reasons: Record<string, number>;
}

export interface ILegacyMigrationOrganizationCount {
  organizationId: string;
  written: number;
  skipped: number;
}

export interface ILegacyEnablementChange {
  organizationId: string;
  legacyField: string;
  definitionKey: string;
  from: boolean | null;
  to: boolean;
  changed: boolean;
  status:
    | 'changed'
    | 'unchanged'
    | 'missing-definition'
    | 'definition-deleted'
    | 'invalid-organization'
    | 'write-failed';
  message?: string;
}

export interface ILegacyEnablementReport {
  settingsRead: number;
  considered: number;
  changed: number;
  unchanged: number;
  skipped: number;
  /**
   * Enablement writes that threw. These are real failures, not skips: the CLI
   * exits non-zero for them, exactly as it does for a failed value write, so a
   * run that could not apply the eight legacy switches cannot look successful.
   */
  failed: number;
  changes: ILegacyEnablementChange[];
}

export interface ILegacyReferenceCheck {
  key: string;
  checked: number;
  resolved: number;
  dangling: number;
  /** `operationalGroup` ids that matched the legacy `Organization` target. */
  legacyModelResolved: number;
}

export interface ILegacyMigrationTotals {
  considered: number;
  written: number;
  skipped: number;
  /** Value write failures **plus** enablement write failures. */
  failed: number;
  /** Subset of `failed` attributable to value writes. */
  failedValues: number;
  /** Subset of `failed` attributable to definition enablement writes. */
  failedEnablement: number;
}

export interface ILegacyMigrationReport {
  /** True when nothing was written (the default). */
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  organizationIds: string[] | null;
  sources: {
    personalDemographics: number;
    userDemographics: number;
    organizationSettings: number;
    userDemographicsWithOrganizationColumn: number;
    userDemographicsResolvedFromMemberships: number;
  };
  totals: ILegacyMigrationTotals;
  definitions: ILegacyMigrationDefinitionCount[];
  organizations: ILegacyMigrationOrganizationCount[];
  enablement: ILegacyEnablementReport;
  referenceChecks: ILegacyReferenceCheck[];
  unmatchedValues: Array<{ key: string; value: string; count: number }>;
  unresolved: ILegacyUnresolvedRecord[];
  /** Actionable skip details (identical existing values are only counted). */
  skips: ILegacyMigrationSkip[];
  skipsTruncated: boolean;
  notes: string[];
}

export interface ILegacyMigrationOptions {
  /** Write. Without this the run is a dry run that touches nothing. */
  apply?: boolean;
  /** Restrict the run to these organization ids (values and enablement). */
  organizationIds?: string[];
  includePersonalDemographics?: boolean;
  includeUserDemographics?: boolean;
  includeEnablement?: boolean;
  /** Update existing values that differ instead of reporting `existing-differs`. */
  overwrite?: boolean;
  maxSkipDetails?: number;
  /** Values per `writeValues` call. */
  batchSize?: number;
  /** Fixed clock for tests. */
  now?: Date;
}

export interface IOrganizationResolution {
  organizationId: string | null;
  membershipId: string | null;
  reason: 'resolved' | 'missing-user' | 'no-organization' | 'ambiguous-organization';
  detail: string;
  candidates: string[];
  clientWideMemberships: number;
}

const DEFAULT_MAX_SKIP_DETAILS = 100;
const DEFAULT_BATCH_SIZE = 200;

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));
const normalizeDefinitionKey = (value: unknown): string =>
  `${value || ''}`.trim().toLowerCase();

const SKIP_REASONS: LegacyMigrationSkipReason[] = [
  'no-organization',
  'ambiguous-organization',
  'missing-user',
  'missing-definition',
  'unmapped-value',
  'invalid-value',
  'dangling-reference',
  'existing',
  'existing-differs',
  'superseded',
  'write-failed',
];

const emptyReasons = (): Record<string, number> =>
  SKIP_REASONS.reduce<Record<string, number>>((accumulator, reason) => {
    accumulator[reason] = 0;
    return accumulator;
  }, {});

/**
 * Resolves the organization a legacy row belongs to.
 *
 * @param userId the row's user id (already normalised)
 * @param memberships the user's embedded memberships
 */
export const resolveOrganizationForUser = (
  userId: string | null,
  memberships: ILegacyMembershipRecord[] = [],
): IOrganizationResolution => {
  const usable: Array<{ organizationId: string; membershipId: string | null; businessUnitId: string | null }> = [];
  let clientWideMemberships = 0;

  (Array.isArray(memberships) ? memberships : []).forEach((membership) => {
    if (!membership) return;

    const organizationId = legacyIdString(membership.organizationId);
    if (organizationId === null) {
      // `organizationId: null` is a client-wide membership, not an org.
      clientWideMemberships += 1;
      return;
    }

    // A malformed organization id cannot resolve an organization either.
    if (isLegacyId(organizationId) === false) return;

    if (membership.enabled === false) return;

    usable.push({
      organizationId,
      membershipId: legacyIdString(membership._id),
      businessUnitId: legacyIdString(membership.businessUnitId),
    });
  });

  if (!userId) {
    return {
      organizationId: null,
      membershipId: null,
      reason: 'missing-user',
      detail: 'The legacy row has no user id',
      candidates: [],
      clientWideMemberships,
    };
  }

  const candidates = unique(usable.map((entry) => entry.organizationId));

  if (candidates.length === 0) {
    return {
      organizationId: null,
      membershipId: null,
      reason: 'no-organization',
      detail: clientWideMemberships > 0
        ? `Only ${clientWideMemberships} client-wide membership(s) (organizationId: null); no organization membership`
        : 'The user has no enabled organization membership',
      candidates: [],
      clientWideMemberships,
    };
  }

  if (candidates.length > 1) {
    return {
      organizationId: null,
      membershipId: null,
      reason: 'ambiguous-organization',
      detail: `The user belongs to ${candidates.length} organizations; the organization cannot be chosen without guessing`,
      candidates,
      clientWideMemberships,
    };
  }

  const forOrganization = usable.filter((entry) => entry.organizationId === candidates[0]);
  // Prefer the organization-level membership (no business unit) for `membership`.
  const preferred = forOrganization.find((entry) => entry.businessUnitId === null) || forOrganization[0];

  return {
    organizationId: candidates[0],
    membershipId: preferred ? preferred.membershipId : null,
    reason: 'resolved',
    detail: 'Resolved from the user\'s organization membership',
    candidates,
    clientWideMemberships,
  };
};

/** Deep, type-insensitive comparison used for idempotency. */
export const sameLegacyValue = (left: unknown, right: unknown): boolean => {
  const comparable = (value: unknown): unknown => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return `date:${value.getTime()}`;
    if (Array.isArray(value)) return value.map(comparable).sort();
    if (typeof value === 'object') {
      const candidate = value as { toHexString?: unknown; _id?: unknown };
      if (typeof candidate.toHexString === 'function') return `id:${candidate.toHexString()}`;
      if (candidate._id !== undefined) return comparable(candidate._id);
      return value;
    }
    if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) return `id:${value.toLowerCase()}`;
    if (typeof value === 'number' && Number.isNaN(value)) return 'nan';
    return value;
  };

  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
};

interface IPlannedValue {
  organizationId: string;
  userId: string;
  membershipId: string | null;
  key: string;
  value: unknown;
  source: LegacyMigrationSourceName;
  sourceId?: string;
  field: string;
}

interface ICounter {
  key: string;
  present: number;
  written: number;
  skipped: number;
  reasons: Record<string, number>;
}

const definitionKeyOrder = (): string[] => {
  const keys: string[] = [];
  const push = (key: string) => {
    const normalized = normalizeDefinitionKey(key);
    if (normalized.length > 0 && keys.indexOf(normalized) < 0) keys.push(normalized);
  };
  LEGACY_SETTINGS_DEFINITION_MAP.forEach((mapping) => push(mapping.definitionKey));
  LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS.forEach((mapping) => push(mapping.definitionKey));
  LEGACY_USER_DEMOGRAPHIC_FIELDS.forEach((mapping) => push(mapping.definitionKey));
  return keys;
};

const chunk = <T>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

/**
 * Runs the legacy migration.
 *
 * @param source read side
 * @param target write side (never called unless `options.apply` is true)
 * @param options see `ILegacyMigrationOptions`
 */
export const migrateLegacyDemographics = async (
  source: ILegacyDemographicsSource,
  target: ILegacyMigrationTarget,
  options: ILegacyMigrationOptions = {},
): Promise<ILegacyMigrationReport> => {
  const startedAt = options.now instanceof Date ? options.now : new Date();
  const apply = options.apply === true;
  const includePersonal = options.includePersonalDemographics !== false;
  const includeUser = options.includeUserDemographics !== false;
  const includeEnablement = options.includeEnablement !== false;
  const overwrite = options.overwrite === true;
  const maxSkipDetails = typeof options.maxSkipDetails === 'number' && options.maxSkipDetails >= 0
    ? options.maxSkipDetails
    : DEFAULT_MAX_SKIP_DETAILS;
  const batchSize = typeof options.batchSize === 'number' && options.batchSize > 0
    ? options.batchSize
    : DEFAULT_BATCH_SIZE;

  const organizationFilter = Array.isArray(options.organizationIds) && options.organizationIds.length > 0
    ? unique(options.organizationIds.map((id) => `${id}`.trim()).filter((id) => id.length > 0))
    : null;

  const notes: string[] = [
    'Organization resolution: a PersonalDemographic row belongs to the single enabled organization membership whose organizationId is non-null; client-wide memberships (organizationId: null) are ignored; zero candidates is reported as no-organization and more than one as ambiguous-organization. Nothing is guessed.',
    'PersonalDemographic.operationalGroup references Organization in the legacy schema (not OperationalGroup). The stored id is treated as opaque and is accepted when it exists in OperationalGroup (the definition target) or in Organization (the legacy target); the match is counted in referenceChecks.',
    'age maps to the dateOfBirth definition: the legacy model stores dob and has no age-band value, so dateOfBirth is where the migrated data lives. ageBand is a derived reporting bucket and is not enabled from the legacy age flag.',
    'Legacy collections are read only in this run; no legacy document is modified or deleted.',
    'totals.failed counts failed value writes plus failed definition-enablement writes; totals.failedValues and totals.failedEnablement break it down. A non-zero totals.failed makes the command exit non-zero.',
  ];

  const counters = new Map<string, ICounter>();
  const counterFor = (key: string): ICounter => {
    const normalized = normalizeDefinitionKey(key);
    const existing = counters.get(normalized);
    if (existing) return existing;
    const counter: ICounter = { key: normalized, present: 0, written: 0, skipped: 0, reasons: emptyReasons() };
    counters.set(normalized, counter);
    return counter;
  };

  const organizations = new Map<string, ILegacyMigrationOrganizationCount>();
  const organizationCountFor = (organizationId: string): ILegacyMigrationOrganizationCount => {
    const existing = organizations.get(organizationId);
    if (existing) return existing;
    const counter: ILegacyMigrationOrganizationCount = { organizationId, written: 0, skipped: 0 };
    organizations.set(organizationId, counter);
    return counter;
  };

  const skips: ILegacyMigrationSkip[] = [];
  let skipsTruncated = false;
  const unresolved: ILegacyUnresolvedRecord[] = [];
  const unmatched = new Map<string, { key: string; value: string; count: number }>();
  const referenceChecks = new Map<string, ILegacyReferenceCheck>();

  const referenceCheckFor = (key: string): ILegacyReferenceCheck => {
    const normalized = normalizeDefinitionKey(key);
    const existing = referenceChecks.get(normalized);
    if (existing) return existing;
    const counter: ILegacyReferenceCheck = {
      key: normalized,
      checked: 0,
      resolved: 0,
      dangling: 0,
      legacyModelResolved: 0,
    };
    referenceChecks.set(normalized, counter);
    return counter;
  };

  const recordSkip = (params: ILegacyMigrationSkip): void => {
    const counter = counterFor(params.key);
    counter.skipped += 1;
    counter.reasons[params.reason] = (counter.reasons[params.reason] || 0) + 1;
    if (params.organizationId) organizationCountFor(params.organizationId).skipped += 1;

    if (params.reason === 'unmapped-value') {
      const raw = params.value === undefined || params.value === null ? '(none)' : `${params.value}`;
      const key = `${normalizeDefinitionKey(params.key)}::${raw}`;
      const existing = unmatched.get(key);
      if (existing) existing.count += 1;
      else unmatched.set(key, { key: normalizeDefinitionKey(params.key), value: raw, count: 1 });
    }

    // Identical existing values are expected on every re-run; keeping them out
    // of the detail list keeps the report about actionable rows.
    if (params.reason === 'existing') return;

    if (skips.length >= maxSkipDetails) {
      skipsTruncated = true;
      return;
    }

    skips.push(params);
  };

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------
  const [personalRecords, userRecords, settingsRecords] = await Promise.all([
    includePersonal && typeof source.listPersonalDemographics === 'function'
      ? source.listPersonalDemographics()
      : Promise.resolve([] as ILegacyPersonalDemographicRecord[]),
    includeUser && typeof source.listUserDemographics === 'function'
      ? source.listUserDemographics()
      : Promise.resolve([] as ILegacyUserDemographicRecord[]),
    includeEnablement && typeof source.listOrganizationSettings === 'function'
      ? source.listOrganizationSettings()
      : Promise.resolve([] as ILegacyOrganizationSettingsRecord[]),
  ]);

  const userIdSet: string[] = [];
  const addUserId = (value: unknown) => {
    const id = legacyIdString(value);
    // A malformed user id cannot own a value; it is reported as missing-user.
    if (id && isLegacyId(id) && userIdSet.indexOf(id) < 0) userIdSet.push(id);
  };

  personalRecords.forEach((record) => addUserId(record?.userId));
  userRecords.forEach((record) => addUserId(record?.user));

  const membershipRows = userIdSet.length > 0
    ? await source.listUserMemberships(userIdSet)
    : [];
  const membershipIndex = new Map<string, ILegacyMembershipRecord[]>();
  (Array.isArray(membershipRows) ? membershipRows : []).forEach((row) => {
    const userId = legacyIdString(row?.userId);
    if (!userId) return;
    membershipIndex.set(userId, Array.isArray(row.memberships) ? row.memberships : []);
  });

  const settingsOrganizationIds = unique(
    settingsRecords
      .map((record) => legacyIdString(record?.organization))
      .filter((id): id is string => id !== null && isLegacyId(id)),
  );

  // Resolve every record's organization before loading definitions, because
  // the definition set is per organization.
  const personalResolutions = personalRecords.map((record) => {
    const userId = legacyIdString(record?.userId);
    return resolveOrganizationForUser(userId, membershipIndex.get(userId || '') || []);
  });
  const userResolutions = userRecords.map((record) => {
    const userId = legacyIdString(record?.user);
    const explicit = legacyIdString(record?.organization);
    if (explicit && isLegacyId(explicit)) {
      const memberships = (membershipIndex.get(userId || '') || [])
        .filter((membership) => legacyIdString(membership?.organizationId) === explicit && membership?.enabled !== false);
      const preferred = memberships.find((membership) => legacyIdString(membership?.businessUnitId) === null)
        || memberships[0];
      return {
        organizationId: explicit,
        membershipId: legacyIdString(preferred?._id),
        reason: 'resolved' as const,
        detail: 'Taken from the UserDemographics.organization column',
        candidates: [explicit],
        clientWideMemberships: 0,
      };
    }
    return resolveOrganizationForUser(userId, membershipIndex.get(userId || '') || []);
  });

  const resolvedOrganizationIds = unique([
    ...personalResolutions.map((resolution) => resolution.organizationId),
    ...userResolutions.map((resolution) => resolution.organizationId),
    ...settingsOrganizationIds,
  ].filter((id): id is string => id !== null));

  const activeDefinitions = new Map<string, any>();
  const deletedDefinitions = new Map<string, any>();
  if (resolvedOrganizationIds.length > 0) {
    const definitions = await source.listDefinitions(resolvedOrganizationIds);
    (Array.isArray(definitions) ? definitions : []).forEach((definition) => {
      const organizationId = legacyIdString(definition?.organization);
      const key = normalizeDefinitionKey(definition?.key);
      if (!organizationId || key.length === 0) return;
      const indexKey = `${organizationId}::${key}`;
      if (definition?.deleted === true) deletedDefinitions.set(indexKey, definition);
      else activeDefinitions.set(indexKey, definition);
    });
  }

  // Legacy `Demographic` documents referenced by UserDemographics fields.
  const legacyReferenceIds: string[] = [];
  if (includeUser && typeof source.listLegacyDemographicReferences === 'function') {
    userRecords.forEach((record) => {
      LEGACY_DEMOGRAPHIC_REFERENCE_FIELDS.forEach((field) => {
        const id = legacyIdString((record as Record<string, any>)?.[field]);
        if (id && isLegacyId(id) && legacyReferenceIds.indexOf(id) < 0) legacyReferenceIds.push(id);
      });
    });
  }
  const legacyReferences = legacyReferenceIds.length > 0 && typeof source.listLegacyDemographicReferences === 'function'
    ? await source.listLegacyDemographicReferences(legacyReferenceIds)
    : [];
  const legacyReferenceIndex = new Map<string, ILegacyDemographicReference>();
  (Array.isArray(legacyReferences) ? legacyReferences : []).forEach((reference) => {
    const id = legacyIdString(reference?._id);
    if (id) legacyReferenceIndex.set(id, reference);
  });

  // Reference existence is repeated across every row of the same organization,
  // so memoise it: a migration of ten thousand members must not issue ten
  // thousand identical `countDocuments` calls.
  const referenceExistenceCache = new Map<string, boolean>();
  const referenceExists = async (model: string, id: string): Promise<boolean> => {
    const cacheKey = `${model}::${id}`;
    if (referenceExistenceCache.has(cacheKey)) return referenceExistenceCache.get(cacheKey) === true;
    const exists = await source.referenceExists(model, id);
    referenceExistenceCache.set(cacheKey, exists);
    return exists;
  };

  const operationalGroupTitleCache = new Map<string, string | null>();
  const resolveOperationalGroupByTitle = async (title: string): Promise<string | null> => {
    const normalized = title.trim().toLowerCase();
    if (operationalGroupTitleCache.has(normalized)) return operationalGroupTitleCache.get(normalized) ?? null;
    const match = typeof source.findOperationalGroupByTitle === 'function'
      ? await source.findOperationalGroupByTitle(title.trim())
      : null;
    const id = legacyIdString(match?._id);
    operationalGroupTitleCache.set(normalized, id);
    return id;
  };

  // -------------------------------------------------------------------------
  // Plan
  // -------------------------------------------------------------------------
  const plan: IPlannedValue[] = [];
  const plannedKeys = new Set<string>();
  let userDemographicsWithOrganizationColumn = 0;
  let userDemographicsResolvedFromMemberships = 0;

  const pushSkipForUnresolved = (
    sourceName: LegacyMigrationSourceName,
    record: Record<string, any>,
    sourceId: string | undefined,
    userId: string | null,
    resolution: IOrganizationResolution,
    mappings: ReadonlyArray<ILegacyValueFieldMapping>,
  ): void => {
    const presentFields = mappings
      .map((mapping) => mapping.legacyField as string)
      .filter((field) => {
        const value = record?.[field];
        return value !== null && value !== undefined && !(typeof value === 'string' && value.trim().length === 0);
      });
    if (presentFields.length === 0) return;

    const reason: LegacyMigrationSkipReason = resolution.reason === 'ambiguous-organization'
      ? 'ambiguous-organization'
      : resolution.reason === 'missing-user'
        ? 'missing-user'
        : 'no-organization';

    mappings.forEach((mapping) => {
      const value = record?.[mapping.legacyField as string];
      if (value === null || value === undefined) return;
      if (typeof value === 'string' && value.trim().length === 0) return;
      counterFor(mapping.definitionKey).present += 1;
      recordSkip({
        source: sourceName,
        sourceId,
        userId: userId || undefined,
        key: mapping.definitionKey,
        field: mapping.legacyField,
        reason,
        detail: resolution.detail,
        value: typeof value === 'string' ? value : undefined,
      });
    });

    if (resolution.reason !== 'missing-user') {
      unresolved.push({
        source: sourceName,
        sourceId,
        userId: userId || undefined,
        reason: resolution.reason === 'ambiguous-organization' ? 'ambiguous-organization' : 'no-organization',
        detail: resolution.detail,
        candidates: resolution.candidates.length > 0 ? resolution.candidates : undefined,
        fields: presentFields,
      });
    }
  };

  const processRecord = async (
    sourceName: LegacyMigrationSourceName,
    record: Record<string, any>,
    sourceId: string | undefined,
    userId: string | null,
    resolution: IOrganizationResolution,
    mappings: ReadonlyArray<ILegacyValueFieldMapping>,
  ): Promise<void> => {
    if (resolution.reason !== 'resolved' || !resolution.organizationId) {
      pushSkipForUnresolved(sourceName, record, sourceId, userId, resolution, mappings);
      return;
    }

    if (organizationFilter && organizationFilter.indexOf(resolution.organizationId) < 0) return;

    const organizationId = resolution.organizationId;

    for (const mapping of mappings) {
      const field = mapping.legacyField as string;
      const rawValue = record?.[field];
      if (rawValue === null || rawValue === undefined) continue;
      if (typeof rawValue === 'string' && rawValue.trim().length === 0) continue;

      const counter = counterFor(mapping.definitionKey);
      counter.present += 1;

      const definition = activeDefinitions.get(`${organizationId}::${normalizeDefinitionKey(mapping.definitionKey)}`);

      if (!definition) {
        const deleted = deletedDefinitions.has(`${organizationId}::${normalizeDefinitionKey(mapping.definitionKey)}`);
        recordSkip({
          source: sourceName,
          sourceId,
          userId: userId || undefined,
          organizationId,
          key: mapping.definitionKey,
          field,
          reason: 'missing-definition',
          detail: deleted
            ? `Definition [${mapping.definitionKey}] is soft-deleted in organization [${organizationId}]`
            : `Definition [${mapping.definitionKey}] is not seeded in organization [${organizationId}]`,
          value: typeof rawValue === 'string' ? rawValue : undefined,
        });
        continue;
      }

      const definitionKey = normalizeDefinitionKey(definition.key);
      const plannedKey = `${organizationId}::${userId}::${definitionKey}`;
      if (plannedKeys.has(plannedKey)) {
        recordSkip({
          source: sourceName,
          sourceId,
          userId: userId || undefined,
          organizationId,
          key: definitionKey,
          field,
          reason: 'superseded',
          detail: 'A PersonalDemographic value for this definition was already planned; UserDemographics only fills gaps',
          value: typeof rawValue === 'string' ? rawValue : undefined,
        });
        continue;
      }

      let candidate: unknown = rawValue;

      // UserDemographics stores four fields as refs to the legacy `Demographic`
      // collection. Decode them before mapping.
      if (sourceName === LEGACY_USER_SOURCE && LEGACY_DEMOGRAPHIC_REFERENCE_FIELDS.indexOf(field) >= 0) {
        const referenceId = legacyIdString(rawValue);
        if (referenceId && isLegacyId(referenceId)) {
          const reference = legacyReferenceIndex.get(referenceId);
          if (!reference) {
            recordSkip({
              source: sourceName,
              sourceId,
              userId: userId || undefined,
              organizationId,
              key: definitionKey,
              field,
              reason: 'unmapped-value',
              detail: `Legacy Demographic [${referenceId}] referenced by UserDemographics.${field} does not exist`,
              value: referenceId,
            });
            continue;
          }

          if (field === 'operationalGroup') {
            const title = `${reference.title || reference.key || ''}`.trim();
            const operationalGroupId = title.length > 0
              ? await resolveOperationalGroupByTitle(title)
              : null;
            if (!operationalGroupId) {
              recordSkip({
                source: sourceName,
                sourceId,
                userId: userId || undefined,
                organizationId,
                key: definitionKey,
                field,
                reason: 'unmapped-value',
                detail: `No OperationalGroup matches legacy Demographic title '${title}'`,
                value: title || referenceId,
              });
              continue;
            }
            candidate = operationalGroupId;
          } else if (field === 'position') {
            candidate = reference.title || reference.key || referenceId;
          } else {
            candidate = reference.key || reference.title || referenceId;
          }
        }
      }

      const mapped = mapLegacyValue(definition, candidate);
      if (mapped.ok === false || mapped.value === undefined) {
        recordSkip({
          source: sourceName,
          sourceId,
          userId: userId || undefined,
          organizationId,
          key: definitionKey,
          field,
          reason: mapped.reason === 'empty-value' ? 'unmapped-value' : (mapped.reason || 'unmapped-value'),
          detail: mapped.detail,
          value: typeof candidate === 'string' || typeof candidate === 'number' ? candidate : undefined,
        });
        continue;
      }

      const validation = validateDemographicValue(definition, mapped.value);
      if (validation.valid === false) {
        const first = validation.errors[0];
        recordSkip({
          source: sourceName,
          sourceId,
          userId: userId || undefined,
          organizationId,
          key: definitionKey,
          field,
          reason: 'invalid-value',
          detail: validation.errors.map((error) => `${error.path || '(value)'}: ${error.message}`).join('; '),
          path: first?.path,
          message: first?.message,
          value: typeof mapped.value === 'string' || typeof mapped.value === 'number' ? mapped.value : undefined,
        });
        continue;
      }

      if (definition?.valueType === 'reference') {
        const referenceCheck = referenceCheckFor(definitionKey);
        referenceCheck.checked += 1;

        const referenceId = legacyIdString(mapped.value);
        const models: string[] = [definition?.reference?.model || 'Region'];
        // The legacy PersonalDemographic.operationalGroup ref points at
        // Organization, while the definition points at OperationalGroup. Accept
        // either and record which one matched.
        if (models[0] === 'OperationalGroup') models.push('Organization');

        let matchedModel: string | null = null;
        if (referenceId) {
          for (const model of models) {
            // eslint-disable-next-line no-await-in-loop
            const exists = await referenceExists(model, referenceId);
            if (exists) {
              matchedModel = model;
              break;
            }
          }
        }

        if (!matchedModel) {
          referenceCheck.dangling += 1;
          recordSkip({
            source: sourceName,
            sourceId,
            userId: userId || undefined,
            organizationId,
            key: definitionKey,
            field,
            reason: 'dangling-reference',
            detail: `Referenced ${models.join(' or ')} [${referenceId || mapped.value}] does not exist`,
            value: referenceId || undefined,
          });
          continue;
        }

        referenceCheck.resolved += 1;
        if (matchedModel !== models[0]) referenceCheck.legacyModelResolved += 1;
      }

      plannedKeys.add(plannedKey);
      plan.push({
        organizationId,
        userId: userId as string,
        membershipId: resolution.membershipId,
        key: definitionKey,
        value: mapped.value,
        source: sourceName,
        sourceId,
        field,
      });
    }
  };

  // PersonalDemographic first: it owns the authoritative literals, so
  // UserDemographics can only fill definitions it did not cover.
  for (let index = 0; index < personalRecords.length; index += 1) {
    const record = personalRecords[index] as unknown as Record<string, any>;
    // eslint-disable-next-line no-await-in-loop
    await processRecord(
      LEGACY_PERSONAL_SOURCE,
      record,
      legacyIdString(record?._id) || undefined,
      legacyIdString(record?.userId),
      personalResolutions[index],
      LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS,
    );
  }

  for (let index = 0; index < userRecords.length; index += 1) {
    const record = userRecords[index] as unknown as Record<string, any>;
    const explicitOrganization = legacyIdString(record?.organization);
    if (explicitOrganization && isLegacyId(explicitOrganization)) {
      userDemographicsWithOrganizationColumn += 1;
    } else if (userResolutions[index].reason === 'resolved') {
      userDemographicsResolvedFromMemberships += 1;
    }
    // eslint-disable-next-line no-await-in-loop
    await processRecord(
      LEGACY_USER_SOURCE,
      record,
      legacyIdString(record?._id) || undefined,
      legacyIdString(record?.user),
      userResolutions[index],
      LEGACY_USER_DEMOGRAPHIC_FIELDS,
    );
  }

  // -------------------------------------------------------------------------
  // Existing values (idempotency)
  // -------------------------------------------------------------------------
  const existingValues = plan.length > 0 && typeof source.listExistingValues === 'function'
    ? await source.listExistingValues(
      unique(plan.map((entry) => entry.organizationId)),
      unique(plan.map((entry) => entry.userId)),
    )
    : [];
  const existingIndex = new Map<string, ILegacyExistingValue>();
  (Array.isArray(existingValues) ? existingValues : []).forEach((value) => {
    const organizationId = legacyIdString(value?.organization);
    const userId = legacyIdString(value?.user);
    const key = normalizeDefinitionKey(value?.key);
    if (!organizationId || !userId || !key) return;
    existingIndex.set(`${organizationId}::${userId}::${key}`, value);
  });

  const toWrite: IPlannedValue[] = [];

  plan.forEach((entry) => {
    const existing = existingIndex.get(`${entry.organizationId}::${entry.userId}::${entry.key}`);
    if (!existing) {
      toWrite.push(entry);
      return;
    }

    if (sameLegacyValue(existing.value, entry.value)) {
      recordSkip({
        source: entry.source,
        sourceId: entry.sourceId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        key: entry.key,
        field: entry.field,
        reason: 'existing',
        detail: 'An identical value already exists',
      });
      return;
    }

    if (overwrite !== true) {
      recordSkip({
        source: entry.source,
        sourceId: entry.sourceId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        key: entry.key,
        field: entry.field,
        reason: 'existing-differs',
        detail: 'A different value already exists; re-run with --overwrite to replace it',
        value: typeof entry.value === 'string' || typeof entry.value === 'number' ? entry.value : undefined,
      });
      return;
    }

    toWrite.push(entry);
  });

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------
  const markWritten = (entry: IPlannedValue) => {
    counterFor(entry.key).written += 1;
    organizationCountFor(entry.organizationId).written += 1;
  };

  const markWriteFailed = (entry: IPlannedValue, error: unknown) => {
    recordSkip({
      source: entry.source,
      sourceId: entry.sourceId,
      userId: entry.userId,
      organizationId: entry.organizationId,
      key: entry.key,
      field: entry.field,
      reason: 'write-failed',
      detail: error instanceof Error ? error.message : `${error}`,
    });
  };

  if (apply !== true) {
    toWrite.forEach(markWritten);
  } else {
    const byOrganization = new Map<string, IPlannedValue[]>();
    toWrite.forEach((entry) => {
      const entries = byOrganization.get(entry.organizationId) || [];
      entries.push(entry);
      byOrganization.set(entry.organizationId, entries);
    });

    for (const [organizationId, entries] of byOrganization) {
      for (const batch of chunk(entries, batchSize)) {
        const inputs: ILegacyMigrationValueInput[] = batch.map((entry) => ({
          user: entry.userId,
          key: entry.key,
          value: entry.value,
          source: 'import',
          verified: false,
          membership: entry.membershipId,
        }));

        try {
          // eslint-disable-next-line no-await-in-loop
          await target.writeValues(organizationId, inputs);
          batch.forEach(markWritten);
        } catch (batchError) {
          // A bulk validation failure must not hide which row is bad: retry one
          // by one so a single bad value cannot fail its whole organization.
          for (const entry of batch) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await target.writeValues(organizationId, [{
                user: entry.userId,
                key: entry.key,
                value: entry.value,
                source: 'import',
                verified: false,
                membership: entry.membershipId,
              }]);
              markWritten(entry);
            } catch (error) {
              markWriteFailed(entry, error);
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Enablement (the eight legacy booleans)
  // -------------------------------------------------------------------------
  const enablement: ILegacyEnablementReport = {
    settingsRead: settingsRecords.length,
    considered: 0,
    changed: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
    changes: [],
  };

  for (const settings of settingsRecords) {
    const organizationId = legacyIdString(settings?.organization);

    for (const mapping of LEGACY_SETTINGS_DEFINITION_MAP as ReadonlyArray<ILegacySettingMapping>) {
      const targetFlag = settings?.[mapping.legacyField] === true;
      const definitionKey = normalizeDefinitionKey(mapping.definitionKey);

      if (!organizationId || isLegacyId(organizationId) === false) {
        enablement.skipped += 1;
        enablement.changes.push({
          organizationId: organizationId || '',
          legacyField: mapping.legacyField,
          definitionKey,
          from: null,
          to: targetFlag,
          changed: false,
          status: 'invalid-organization',
          message: 'OrganizationDemographicsSettings.organization is missing or not a valid id',
        });
        continue;
      }

      if (organizationFilter && organizationFilter.indexOf(organizationId) < 0) continue;

      enablement.considered += 1;
      const definition = activeDefinitions.get(`${organizationId}::${definitionKey}`);

      if (!definition) {
        const deleted = deletedDefinitions.has(`${organizationId}::${definitionKey}`);
        enablement.skipped += 1;
        enablement.changes.push({
          organizationId,
          legacyField: mapping.legacyField,
          definitionKey,
          from: null,
          to: targetFlag,
          changed: false,
          status: deleted ? 'definition-deleted' : 'missing-definition',
          message: deleted
            ? `Definition [${definitionKey}] is soft-deleted`
            : `Definition [${definitionKey}] is not seeded in this organization`,
        });
        continue;
      }

      const current = definition.enabled !== false;

      if (current === targetFlag) {
        enablement.unchanged += 1;
        enablement.changes.push({
          organizationId,
          legacyField: mapping.legacyField,
          definitionKey,
          from: current,
          to: targetFlag,
          changed: false,
          status: 'unchanged',
        });
        continue;
      }

      if (apply !== true) {
        enablement.changed += 1;
        enablement.changes.push({
          organizationId,
          legacyField: mapping.legacyField,
          definitionKey,
          from: current,
          to: targetFlag,
          changed: true,
          status: 'changed',
          message: 'Dry run: would update the definition enabled flag',
        });
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        await target.setEnabled(organizationId, definitionKey, targetFlag);
        enablement.changed += 1;
        enablement.changes.push({
          organizationId,
          legacyField: mapping.legacyField,
          definitionKey,
          from: current,
          to: targetFlag,
          changed: true,
          status: 'changed',
        });
      } catch (error) {
        // A throw here means the definition's enabled flag was NOT applied.
        // That is a failure of the run, not a skip: it is counted in
        // `enablement.failed` and rolled into `totals.failed`, which is what
        // makes the CLI exit non-zero.
        enablement.failed += 1;
        enablement.changes.push({
          organizationId,
          legacyField: mapping.legacyField,
          definitionKey,
          from: current,
          to: targetFlag,
          changed: false,
          status: 'write-failed',
          message: error instanceof Error ? error.message : `${error}`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------
  const orderedKeys = definitionKeyOrder();
  counters.forEach((_counter, key) => {
    if (orderedKeys.indexOf(key) < 0) orderedKeys.push(key);
  });

  const definitions = orderedKeys
    .map((key) => counters.get(key))
    .filter((counter): counter is ICounter => !!counter && (counter.present > 0 || counter.skipped > 0 || counter.written > 0))
    .map((counter) => ({ ...counter, reasons: { ...counter.reasons } }));

  const failedValues = definitions.reduce(
    (sum, counter) => sum + (counter.reasons['write-failed'] || 0),
    0,
  );
  const failedEnablement = enablement.failed;

  // `failed` is deliberately the union of both write paths. An operator (and the
  // CLI exit code) cares that the run did not fully apply, not which of the two
  // kinds of write was rejected; the sub-counts are kept so the report says
  // which, and `enablement.changes[].status === 'write-failed'` carries the
  // per-definition detail.
  const totals: ILegacyMigrationTotals = {
    considered: definitions.reduce((sum, counter) => sum + counter.present, 0),
    written: definitions.reduce((sum, counter) => sum + counter.written, 0),
    skipped: definitions.reduce((sum, counter) => sum + counter.skipped, 0),
    failed: failedValues + failedEnablement,
    failedValues,
    failedEnablement,
  };

  const finishedAt = options.now instanceof Date ? options.now : new Date();

  return {
    dryRun: apply !== true,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    organizationIds: organizationFilter,
    sources: {
      personalDemographics: personalRecords.length,
      userDemographics: userRecords.length,
      organizationSettings: settingsRecords.length,
      userDemographicsWithOrganizationColumn,
      userDemographicsResolvedFromMemberships,
    },
    totals,
    definitions,
    organizations: Array.from(organizations.values()).sort((left, right) =>
      left.organizationId.localeCompare(right.organizationId)),
    enablement,
    referenceChecks: Array.from(referenceChecks.values()).sort((left, right) => left.key.localeCompare(right.key)),
    unmatchedValues: Array.from(unmatched.values()).sort((left, right) =>
      left.key.localeCompare(right.key) || left.value.localeCompare(right.value)),
    unresolved,
    skips,
    skipsTruncated,
    notes,
  };
};

export default migrateLegacyDemographics;
