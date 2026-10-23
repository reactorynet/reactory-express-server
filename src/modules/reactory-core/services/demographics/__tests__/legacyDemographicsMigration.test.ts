import { ObjectId } from 'mongodb';
import { BASE_DEMOGRAPHIC_TEMPLATES } from '@reactory/server-modules/reactory-core/services/demographics/baseDemographicTemplates';
import {
  migrateLegacyDemographics,
  resolveOrganizationForUser,
  sameLegacyValue,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMigration';
import type {
  ILegacyDemographicsSource,
  ILegacyExistingValue,
  ILegacyMembershipRecord,
  ILegacyMigrationReport,
  ILegacyMigrationTarget,
  ILegacyMigrationValueInput,
  ILegacyUserMemberships,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMigration';

/**
 * ORG-040 engine tests.
 *
 * The engine is deliberately database-free (it reads through
 * `ILegacyDemographicsSource` and writes through `ILegacyMigrationTarget`), so
 * these tests use in-memory doubles and assert the acceptance criteria directly:
 * a dry run writes nothing and reports per-definition counts and reasons, a live
 * run writes the expected rows, a second run writes 0, an unresolvable
 * organization is reported and not written, a client-wide membership does not
 * resolve an organization, a validator failure carries its path/message, and the
 * eight legacy booleans map onto definition enablement idempotently.
 */

const objectId = () => new ObjectId().toHexString();

const ORG_ID = objectId();
const OTHER_ORG_ID = objectId();
const CLIENT_ID = objectId();
const USER_ID = objectId();
const OTHER_USER_ID = objectId();
const MEMBERSHIP_ID = objectId();
const REGION_ID = objectId();
const BUSINESS_UNIT_ID = objectId();
const TEAM_ID = objectId();
const OPERATIONAL_GROUP_ID = objectId();

interface IDefinitionDocument {
  _id: string;
  organization: string;
  key: string;
  title: string;
  valueType: string;
  options?: Array<{ key: string; label?: string; ordinal?: number; deprecated?: boolean }>;
  reference?: { model: string; multiple?: boolean };
  multiValued: boolean;
  required: boolean;
  enabled: boolean;
  deleted: boolean;
}

const definitionsFor = (organizationId: string): IDefinitionDocument[] =>
  BASE_DEMOGRAPHIC_TEMPLATES.map((template) => ({
    _id: objectId(),
    organization: organizationId,
    key: template.key.toLowerCase(),
    title: template.title,
    valueType: template.valueType,
    options: template.options ? template.options.map((option) => ({ ...option })) : undefined,
    reference: template.reference ? { ...template.reference } : undefined,
    multiValued: template.multiValued === true,
    required: template.required,
    enabled: template.enabled,
    deleted: false,
  }));

interface IHarnessConfig {
  personal?: any[];
  user?: any[];
  settings?: any[];
  memberships?: ILegacyUserMemberships[];
  definitions?: IDefinitionDocument[];
  references?: string[];
  legacyDemographics?: Array<{ _id: string; type?: string; key?: string; title?: string }>;
  operationalGroups?: Array<{ _id: string; title: string }>;
  failWrites?: boolean;
  failEnablement?: boolean;
}

interface IHarness {
  source: ILegacyDemographicsSource;
  target: ILegacyMigrationTarget;
  rows: Map<string, ILegacyExistingValue>;
  definitions: IDefinitionDocument[];
  calls: { writeValues: Array<{ organizationId: string; values: ILegacyMigrationValueInput[] }>; setEnabled: Array<{ organizationId: string; key: string; enabled: boolean }> };
}

const createHarness = (config: IHarnessConfig = {}): IHarness => {
  const rows = new Map<string, ILegacyExistingValue>();
  const definitions = config.definitions || definitionsFor(ORG_ID);
  const references = new Set<string>(
    (config.references || [
      `Region::${REGION_ID}`,
      `BusinessUnit::${BUSINESS_UNIT_ID}`,
      `Team::${TEAM_ID}`,
      `OperationalGroup::${OPERATIONAL_GROUP_ID}`,
    ]),
  );
  const calls: IHarness['calls'] = { writeValues: [], setEnabled: [] };

  const source: ILegacyDemographicsSource = {
    listPersonalDemographics: async () => (config.personal || []) as any[],
    listUserDemographics: async () => (config.user || []) as any[],
    listOrganizationSettings: async () => (config.settings || []) as any[],
    listUserMemberships: async (userIds: string[]): Promise<ILegacyUserMemberships[]> =>
      (config.memberships || []).filter((row) => userIds.indexOf(row.userId) >= 0),
    listDefinitions: async (organizationIds: string[]) =>
      definitions.filter((definition) => organizationIds.indexOf(definition.organization) >= 0),
    listExistingValues: async (organizationIds: string[], userIds: string[]): Promise<ILegacyExistingValue[]> =>
      Array.from(rows.values()).filter((row) =>
        organizationIds.indexOf(`${row.organization}`) >= 0 && userIds.indexOf(`${row.user}`) >= 0),
    listLegacyDemographicReferences: async (ids: string[]) =>
      (config.legacyDemographics || []).filter((reference) => ids.indexOf(reference._id) >= 0),
    findOperationalGroupByTitle: async (title: string) => {
      const match = (config.operationalGroups || []).find(
        (group) => group.title.trim().toLowerCase() === title.trim().toLowerCase(),
      );
      return match ? { _id: match._id } : null;
    },
    referenceExists: async (model: string, id: string) => references.has(`${model}::${id}`),
  };

  const target: ILegacyMigrationTarget = {
    writeValues: async (organizationId: string, values: ILegacyMigrationValueInput[]) => {
      if (config.failWrites) throw new Error('simulated write failure');
      calls.writeValues.push({ organizationId, values });
      values.forEach((value) => {
        rows.set(`${organizationId}::${value.user}::${`${value.key}`.toLowerCase()}`, {
          organization: organizationId,
          user: value.user,
          key: `${value.key}`.toLowerCase(),
          value: value.value,
        });
      });
      return values;
    },
    setEnabled: async (organizationId: string, key: string, enabled: boolean) => {
      calls.setEnabled.push({ organizationId, key, enabled });
      if (config.failEnablement) throw new Error('simulated enablement failure');
      const definition = definitions.find(
        (candidate) => candidate.organization === organizationId && candidate.key === `${key}`.toLowerCase(),
      );
      if (definition) definition.enabled = enabled;
      return definition;
    },
  };

  return { source, target, rows, definitions, calls };
};

const countFor = (report: ILegacyMigrationReport, key: string) =>
  report.definitions.find((definition) => definition.key === key);

const organizationMembership = (organizationId: string, id = objectId()): ILegacyMembershipRecord => ({
  _id: id,
  clientId: CLIENT_ID,
  organizationId,
  businessUnitId: null,
  roles: ['USER'],
  enabled: true,
});

const clientWideMembership = (): ILegacyMembershipRecord => ({
  _id: objectId(),
  clientId: CLIENT_ID,
  organizationId: null,
  businessUnitId: null,
  roles: ['USER'],
  enabled: true,
});

const fullPersonalRecord = (overrides: Record<string, any> = {}) => ({
  _id: objectId(),
  userId: USER_ID,
  race: 'African',
  dob: '1990-05-04',
  gender: 'Male',
  pronoun: 'He / Him',
  position: 'Engineer',
  region: REGION_ID,
  operationalGroup: OPERATIONAL_GROUP_ID,
  businessUnit: BUSINESS_UNIT_ID,
  team: TEAM_ID,
  ...overrides,
});

describe('resolveOrganizationForUser (ORG-040)', () => {
  it('resolves exactly one organization membership and prefers the org-level membership', () => {
    const businessUnitMembershipId = objectId();
    const resolution = resolveOrganizationForUser(USER_ID, [
      clientWideMembership(),
      { ...organizationMembership(ORG_ID, MEMBERSHIP_ID) },
      {
        _id: businessUnitMembershipId,
        clientId: CLIENT_ID,
        organizationId: ORG_ID,
        businessUnitId: objectId(),
        enabled: true,
      },
    ]);

    expect(resolution.reason).toBe('resolved');
    expect(resolution.organizationId).toBe(ORG_ID);
    expect(resolution.membershipId).toBe(MEMBERSHIP_ID);
    expect(resolution.clientWideMemberships).toBe(1);
  });

  it('never resolves a client-wide membership (organizationId: null) to an organization', () => {
    const resolution = resolveOrganizationForUser(USER_ID, [clientWideMembership()]);

    expect(resolution.reason).toBe('no-organization');
    expect(resolution.organizationId).toBeNull();
    expect(resolution.detail).toMatch(/client-wide/);
  });

  it('reports multiple organizations as ambiguous rather than guessing', () => {
    const resolution = resolveOrganizationForUser(USER_ID, [
      organizationMembership(ORG_ID),
      organizationMembership(OTHER_ORG_ID),
    ]);

    expect(resolution.reason).toBe('ambiguous-organization');
    expect(resolution.candidates.sort()).toEqual([ORG_ID, OTHER_ORG_ID].sort());
  });

  it('ignores disabled memberships', () => {
    const resolution = resolveOrganizationForUser(USER_ID, [
      { ...organizationMembership(ORG_ID), enabled: false },
    ]);

    expect(resolution.reason).toBe('no-organization');
  });
});

describe('sameLegacyValue (ORG-040)', () => {
  it('treats equal dates, ObjectId strings and multi-values as identical', () => {
    expect(sameLegacyValue(['african'], ['african'])).toBe(true);
    expect(sameLegacyValue(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameLegacyValue(new Date('1990-05-04'), new Date('1990-05-04'))).toBe(true);
    expect(sameLegacyValue(REGION_ID, REGION_ID.toUpperCase())).toBe(true);
    expect(sameLegacyValue(['african'], ['white'])).toBe(false);
  });
});

describe('migrateLegacyDemographics dry run (ORG-040)', () => {
  it('writes nothing and reports counts per definition plus reasons', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord()],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { now: new Date('2026-01-01T00:00:00Z') });

    expect(report.dryRun).toBe(true);
    expect(harness.calls.writeValues).toHaveLength(0);
    expect(harness.calls.setEnabled).toHaveLength(0);
    expect(harness.rows.size).toBe(0);

    expect(report.totals.written).toBe(9);
    expect(report.totals.skipped).toBe(0);
    expect(report.totals.failed).toBe(0);

    expect(countFor(report, 'race')).toMatchObject({ present: 1, written: 1, skipped: 0 });
    expect(countFor(report, 'dateofbirth')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'gender')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'pronoun')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'position')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'region')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'operationalgroup')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'businessunit')).toMatchObject({ present: 1, written: 1 });
    expect(countFor(report, 'team')).toMatchObject({ present: 1, written: 1 });

    // The report must be serialisable as the operator-facing JSON product.
    expect(() => JSON.stringify(report)).not.toThrow();
    expect(report.notes.join(' ')).toMatch(/dateOfBirth/);
  });

  it('reports missing definitions, unmapped values, invalid values and dangling references with reasons', async () => {
    const danglingRegionId = objectId();
    const definitions = definitionsFor(ORG_ID)
      // Force a missing definition for `team` and keep everything else seeded.
      .filter((definition) => definition.key !== 'team');

    const harness = createHarness({
      definitions,
      personal: [
        fullPersonalRecord({
          race: 'Martian',
          region: danglingRegionId,
          gender: 'not-an-id-for-a-region-is-fine-but-not-for-an-enum',
        }),
      ],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target);

    expect(harness.calls.writeValues).toHaveLength(0);
    expect(countFor(report, 'tEaM'.toLowerCase())).toMatchObject({ written: 0 });
    expect(countFor(report, 'team').reasons['missing-definition']).toBe(1);
    expect(countFor(report, 'race').reasons['unmapped-value']).toBe(1);
    expect(countFor(report, 'gender').reasons['unmapped-value']).toBe(1);
    expect(countFor(report, 'region').reasons['dangling-reference']).toBe(1);

    expect(report.unmatchedValues).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'race', value: 'Martian', count: 1 }),
    ]));
    expect(report.referenceChecks.find((check) => check.key === 'region')).toMatchObject({
      checked: 1,
      resolved: 0,
      dangling: 1,
    });
  });

  it('reports a validator failure with its path and message and does not write it', async () => {
    const harness = createHarness({
      // The definition is replaced with an extra JSON Schema that rejects a
      // string shorter than five characters, which passes enumeration mapping
      // but fails validateDemographicValue.
      definitions: definitionsFor(ORG_ID).map((definition) => definition.key === 'position'
        ? { ...definition, schema: { type: 'string', minLength: 5 } }
        : definition),
      personal: [fullPersonalRecord({ position: 'QA' })],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target);

    expect(harness.calls.writeValues).toHaveLength(0);
    expect(countFor(report, 'position').reasons['invalid-value']).toBe(1);

    const skip = report.skips.find((entry) => entry.key === 'position');
    expect(skip).toMatchObject({
      reason: 'invalid-value',
      path: '',
      value: 'QA',
    });
    expect(skip.message).toMatch(/fewer than 5 characters|at least 5 characters/);
  });
});

describe('migrateLegacyDemographics live run (ORG-040)', () => {
  it('writes the expected rows and a second run is a no-op reporting 0 written', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord()],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID, MEMBERSHIP_ID)] }],
    });

    const first = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(first.dryRun).toBe(false);
    expect(first.totals.written).toBe(9);
    expect(harness.rows.size).toBe(9);

    const stored = Array.from(harness.rows.values());
    expect(stored.map((row) => row.key).sort()).toEqual([
      'businessunit',
      'dateofbirth',
      'gender',
      'operationalgroup',
      'position',
      'pronoun',
      'race',
      'region',
      'team',
    ]);
    expect(stored.find((row) => row.key === 'race')?.value).toEqual(['african']);
    expect(stored.find((row) => row.key === 'dateofbirth')?.value).toBeInstanceOf(Date);
    expect(stored.find((row) => row.key === 'gender')?.value).toBe('male');
    expect(stored.find((row) => row.key === 'pronoun')?.value).toBe('he-him');

    // The membership is recorded so multi-org users keep their attribution.
    expect(harness.calls.writeValues[0].values[0].membership).toBe(MEMBERSHIP_ID);

    const second = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(second.totals.written).toBe(0);
    expect(second.totals.skipped).toBe(9);
    expect(harness.rows.size).toBe(9);
    expect(second.definitions.every((definition) => definition.reasons['existing'] === definition.present)).toBe(true);
  });

  it('does not overwrite a different existing value unless --overwrite is set', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord({ position: 'Engineer' })],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    harness.rows.set(`${ORG_ID}::${USER_ID}::position`, {
      organization: ORG_ID,
      user: USER_ID,
      key: 'position',
      value: 'Architect',
    });

    const guarded = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });
    expect(guarded.totals.written).toBe(8);
    expect(countFor(guarded, 'position').reasons['existing-differs']).toBe(1);
    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::position`)?.value).toBe('Architect');

    const overwritten = await migrateLegacyDemographics(harness.source, harness.target, { apply: true, overwrite: true });
    expect(countFor(overwritten, 'position').written).toBe(1);
    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::position`)?.value).toBe('Engineer');
  });

  it('counts write failures instead of throwing', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord()],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      failWrites: true,
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.totals.written).toBe(0);
    expect(report.totals.failed).toBe(9);
    expect(report.skips.every((skip) => skip.reason === 'write-failed')).toBe(true);
  });
});

describe('organization resolution failures (ORG-040)', () => {
  it('reports a user with no resolvable organization as unresolved and writes nothing', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord({ userId: OTHER_USER_ID })],
      memberships: [],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.calls.writeValues).toHaveLength(0);
    expect(report.totals.written).toBe(0);
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]).toMatchObject({
      source: 'PersonalDemographic',
      userId: OTHER_USER_ID,
      reason: 'no-organization',
    });
    expect(report.unresolved[0].fields).toEqual(expect.arrayContaining(['race', 'dob', 'gender']));
    expect(countFor(report, 'race').reasons['no-organization']).toBe(1);
    expect(report.skips.find((skip) => skip.key === 'race')?.reason).toBe('no-organization');
  });

  it('does not use a client-wide membership to resolve an organization', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord({ userId: OTHER_USER_ID })],
      memberships: [{ userId: OTHER_USER_ID, memberships: [clientWideMembership()] }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.calls.writeValues).toHaveLength(0);
    expect(report.unresolved[0]).toMatchObject({ reason: 'no-organization' });
    expect(report.unresolved[0].detail).toMatch(/client-wide/);
    expect(report.skips.filter((skip) => skip.reason === 'no-organization')).toHaveLength(9);
  });

  it('reports an ambiguous organization with its candidates and writes nothing', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord()],
      memberships: [{
        userId: USER_ID,
        memberships: [organizationMembership(ORG_ID), organizationMembership(OTHER_ORG_ID)],
      }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.unresolved[0]).toMatchObject({
      reason: 'ambiguous-organization',
      candidates: expect.arrayContaining([ORG_ID, OTHER_ORG_ID]),
    });
    expect(harness.calls.writeValues).toHaveLength(0);
    expect(countFor(report, 'gender').reasons['ambiguous-organization']).toBe(1);
  });

  it('uses the UserDemographics.organization column when the user has no memberships', async () => {
    const legacyGenderId = objectId();

    const harness = createHarness({
      personal: [],
      user: [{
        _id: objectId(),
        user: USER_ID,
        organization: ORG_ID,
        gender: legacyGenderId,
        position: objectId(),
      }],
      memberships: [],
      legacyDemographics: [
        { _id: legacyGenderId, type: 'gender', key: 'female', title: 'Female' },
        { _id: 'missing-position', type: 'position', key: 'engineer', title: 'Engineer' },
      ],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.sources.userDemographicsWithOrganizationColumn).toBe(1);
    expect(countFor(report, 'gender').written).toBe(1);
    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::gender`)?.value).toBe('female');
  });
});

describe('legacy UserDemographics (ORG-040)', () => {
  it('only fills definitions the PersonalDemographic did not cover', async () => {
    const legacyFemaleId = objectId();
    const legacyPositionId = objectId();

    const harness = createHarness({
      // `position` is absent from the personal record, so UserDemographics owns it.
      personal: [{ ...fullPersonalRecord({ gender: 'Male' }), position: undefined }],
      user: [{
        _id: objectId(),
        user: USER_ID,
        organization: ORG_ID,
        gender: legacyFemaleId,
        position: legacyPositionId,
      }],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      legacyDemographics: [
        { _id: legacyFemaleId, type: 'gender', key: 'female', title: 'Female' },
        { _id: legacyPositionId, type: 'position', key: 'architect', title: 'Architect' },
      ],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(countFor(report, 'gender')).toMatchObject({ present: 2, written: 1, skipped: 1 });
    expect(countFor(report, 'gender').reasons['superseded']).toBe(1);
    expect(report.skips.find((skip) => skip.key === 'gender' && skip.reason === 'superseded')?.source)
      .toBe('UserDemographics');

    // The PersonalDemographic literal wins; the UserDemographics ref fills the gap.
    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::gender`)?.value).toBe('male');
    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::position`)?.value).toBe('Architect');
    expect(report.organizations).toEqual([{ organizationId: ORG_ID, written: 9, skipped: 1 }]);
  });

  it('resolves a legacy Demographic position reference to its title', async () => {
    const legacyPositionId = objectId();

    const harness = createHarness({
      personal: [{ _id: objectId(), userId: USER_ID }],
      user: [{ _id: objectId(), user: USER_ID, organization: ORG_ID, position: legacyPositionId }],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      legacyDemographics: [
        { _id: legacyPositionId, type: 'position', key: 'architect', title: 'Solution Architect' },
      ],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::position`)?.value).toBe('Solution Architect');
    expect(countFor(report, 'position').written).toBe(1);
  });

  it('resolves a legacy operational group title to an OperationalGroup id', async () => {
    const legacyOperationalGroupId = objectId();

    const harness = createHarness({
      personal: [],
      user: [{
        _id: objectId(),
        user: USER_ID,
        organization: ORG_ID,
        operationalGroup: legacyOperationalGroupId,
      }],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      legacyDemographics: [
        { _id: legacyOperationalGroupId, type: 'operationalgroup', key: 'ops', title: 'Operations' },
      ],
      operationalGroups: [{ _id: OPERATIONAL_GROUP_ID, title: 'Operations' }],
    });

    await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::operationalgroup`)?.value).toBe(OPERATIONAL_GROUP_ID);
  });
});

describe('legacy operationalGroup reference trap (ORG-040)', () => {
  it('accepts an Organization id and records that the legacy model matched', async () => {
    const organizationIdAsOperationalGroup = objectId();

    const harness = createHarness({
      personal: [fullPersonalRecord({ operationalGroup: organizationIdAsOperationalGroup })],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      references: [`Organization::${organizationIdAsOperationalGroup}`],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::operationalgroup`)?.value)
      .toBe(organizationIdAsOperationalGroup);
    expect(report.referenceChecks.find((check) => check.key === 'operationalgroup')).toMatchObject({
      checked: 1,
      resolved: 1,
      dangling: 0,
      legacyModelResolved: 1,
    });
    expect(report.notes.join(' ')).toMatch(/references Organization/);
  });
});

describe('OrganizationDemographicsSettings enablement (ORG-040)', () => {
  const settings = {
    _id: objectId(),
    organization: ORG_ID,
    age: false,
    gender: true,
    race: false,
    region: true,
    position: true,
    operationalGroup: false,
    businessUnit: true,
    teams: false,
    deleted: false,
  };

  it('maps the eight booleans onto definition enablement without writing in a dry run', async () => {
    const harness = createHarness({ settings: [settings] });

    const report = await migrateLegacyDemographics(harness.source, harness.target);

    expect(harness.calls.setEnabled).toHaveLength(0);
    expect(report.enablement).toMatchObject({ settingsRead: 1, considered: 8, changed: 4, unchanged: 4, skipped: 0 });

    const changed = report.enablement.changes.filter((change) => change.changed);
    expect(changed.map((change) => change.definitionKey).sort()).toEqual(
      ['dateofbirth', 'operationalgroup', 'race', 'team'].sort(),
    );
    // age -> dateOfBirth, teams -> team.
    expect(changed.find((change) => change.legacyField === 'age')?.definitionKey).toBe('dateofbirth');
    expect(changed.find((change) => change.legacyField === 'teams')?.definitionKey).toBe('team');
  });

  it('applies the flags and a second run does not flip them back', async () => {
    const harness = createHarness({ settings: [settings] });

    const first = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(first.enablement.changed).toBe(4);
    expect(harness.calls.setEnabled).toEqual(expect.arrayContaining([
      { organizationId: ORG_ID, key: 'dateofbirth', enabled: false },
      { organizationId: ORG_ID, key: 'race', enabled: false },
      { organizationId: ORG_ID, key: 'operationalgroup', enabled: false },
      { organizationId: ORG_ID, key: 'team', enabled: false },
    ]));

    const enabledByKey = (key: string) => harness.definitions.find((definition) => definition.key === key)?.enabled;
    expect(enabledByKey('dateofbirth')).toBe(false);
    expect(enabledByKey('race')).toBe(false);
    expect(enabledByKey('operationalgroup')).toBe(false);
    expect(enabledByKey('team')).toBe(false);
    expect(enabledByKey('gender')).toBe(true);

    const second = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(second.enablement.changed).toBe(0);
    expect(second.enablement.unchanged).toBe(8);
    expect(harness.calls.setEnabled).toHaveLength(4);
    expect(enabledByKey('dateofbirth')).toBe(false);
  });

  it('reports a missing definition instead of inventing enablement', async () => {
    const harness = createHarness({
      settings: [settings],
      definitions: definitionsFor(ORG_ID).filter((definition) => definition.key !== 'region'),
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.enablement.skipped).toBe(1);
    expect(report.enablement.changes.find((change) => change.legacyField === 'region')).toMatchObject({
      status: 'missing-definition',
      changed: false,
    });
    expect(harness.calls.setEnabled.some((call) => call.key === 'region')).toBe(false);
  });

  it('honours --no-enablement', async () => {
    const harness = createHarness({ settings: [settings] });

    const report = await migrateLegacyDemographics(harness.source, harness.target, {
      apply: true,
      includeEnablement: false,
    });

    expect(report.enablement.considered).toBe(0);
    expect(harness.calls.setEnabled).toHaveLength(0);
  });
});

describe('organization filter (ORG-040)', () => {
  it('restricts both values and enablement to the supplied organizations', async () => {
    const secondDefinitions = definitionsFor(OTHER_ORG_ID);
    const harness = createHarness({
      personal: [fullPersonalRecord()],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      settings: [{ ...{ age: true, gender: true, race: true, region: true, position: true, operationalGroup: true, businessUnit: true, teams: true }, _id: objectId(), organization: ORG_ID }],
      definitions: [...definitionsFor(ORG_ID), ...secondDefinitions],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, {
      apply: true,
      organizationIds: [OTHER_ORG_ID],
    });

    expect(report.totals.written).toBe(0);
    expect(report.enablement.considered).toBe(0);
    expect(harness.calls.writeValues).toHaveLength(0);
  });
});

describe('report robustness (ORG-040)', () => {
  it('reports a legacy row with no user id as missing-user', async () => {
    const harness = createHarness({
      personal: [{ _id: objectId(), userId: null, race: 'African' }],
      memberships: [],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.calls.writeValues).toHaveLength(0);
    expect(countFor(report, 'race').reasons['missing-user']).toBe(1);
    expect(report.unresolved).toHaveLength(0);
  });

  it('truncates skip details while keeping the counts complete', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord({ race: 'Martian', gender: 'Klingon' })],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, {
      maxSkipDetails: 1,
    });

    expect(report.skips).toHaveLength(1);
    expect(report.skipsTruncated).toBe(true);
    expect(countFor(report, 'race').reasons['unmapped-value']).toBe(1);
    expect(countFor(report, 'gender').reasons['unmapped-value']).toBe(1);
    expect(report.totals.skipped).toBe(2);
  });

  it('never truncates when maxSkipDetails is 0 but only existing rows are skipped', async () => {
    const harness = createHarness({
      personal: [fullPersonalRecord()],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    await migrateLegacyDemographics(harness.source, harness.target, { apply: true });
    const second = await migrateLegacyDemographics(harness.source, harness.target, {
      apply: true,
      maxSkipDetails: 0,
    });

    // Identical existing values are counted but never listed as actionable skips.
    expect(second.totals.written).toBe(0);
    expect(second.skips).toHaveLength(0);
    expect(second.skipsTruncated).toBe(false);
  });

  it('counts a UserDemographics row resolved from memberships separately from its own column', async () => {
    const harness = createHarness({
      personal: [],
      user: [{ _id: objectId(), user: USER_ID, position: 'Engineer' }],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.sources.userDemographicsWithOrganizationColumn).toBe(0);
    expect(report.sources.userDemographicsResolvedFromMemberships).toBe(1);
    expect(harness.rows.get(`${ORG_ID}::${USER_ID}::position`)?.value).toBe('Engineer');
  });

  it('reports an operational group title that matches no OperationalGroup', async () => {
    const legacyOperationalGroupId = objectId();

    const harness = createHarness({
      personal: [],
      user: [{
        _id: objectId(),
        user: USER_ID,
        organization: ORG_ID,
        operationalGroup: legacyOperationalGroupId,
      }],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      legacyDemographics: [
        { _id: legacyOperationalGroupId, type: 'operationalgroup', key: 'ops', title: 'Operations' },
      ],
      operationalGroups: [],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(harness.rows.size).toBe(0);
    expect(countFor(report, 'operationalgroup').reasons['unmapped-value']).toBe(1);
    expect(report.unmatchedValues).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'operationalgroup', value: 'Operations' }),
    ]));
  });

  it('treats a legacy Demographic reference that does not exist as unmapped', async () => {
    const harness = createHarness({
      personal: [],
      user: [{ _id: objectId(), user: USER_ID, organization: ORG_ID, gender: objectId() }],
      memberships: [{ userId: USER_ID, memberships: [organizationMembership(ORG_ID)] }],
      legacyDemographics: [],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(countFor(report, 'gender').reasons['unmapped-value']).toBe(1);
    expect(report.skips.find((skip) => skip.key === 'gender')?.detail).toMatch(/does not exist/);
  });

  it('compares ObjectId-like, Date and NaN values structurally', async () => {
    const hex = objectId();

    expect(sameLegacyValue({ toHexString: () => hex }, { toHexString: () => hex })).toBe(true);
    expect(sameLegacyValue({ _id: hex }, hex)).toBe(true);
    expect(sameLegacyValue({ nested: 1 }, { nested: 1 })).toBe(true);
    expect(sameLegacyValue(Number.NaN, Number.NaN)).toBe(true);
    expect(sameLegacyValue(null, undefined)).toBe(true);
    expect(sameLegacyValue(new Date('2020-01-01'), new Date('2021-01-01'))).toBe(false);
  });
});

describe('enablement failures (ORG-040)', () => {
  const settings = {
    _id: objectId(),
    organization: ORG_ID,
    age: true,
    gender: true,
    race: true,
    region: true,
    position: true,
    operationalGroup: true,
    businessUnit: true,
    teams: true,
    deleted: false,
  };

  it('counts a failed enablement write in enablement.failed and totals.failed', async () => {
    const harness = createHarness({
      settings: [settings],
      definitions: definitionsFor(ORG_ID).map((definition) =>
        definition.key === 'race' ? { ...definition, enabled: false } : definition),
      failEnablement: true,
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.enablement.failed).toBe(1);
    expect(report.enablement.changes.find((change) => change.definitionKey === 'race')).toMatchObject({
      status: 'write-failed',
      changed: false,
      message: 'simulated enablement failure',
    });
    expect(report.totals.failedEnablement).toBe(1);
    expect(report.totals.failedValues).toBe(0);
    expect(report.totals.failed).toBe(1);

    // A failed enablement is a failure, not a skip.
    expect(report.enablement.skipped).toBe(0);
  });

  it('reports settings with an invalid organization instead of enabling anything', async () => {
    const harness = createHarness({
      settings: [{ ...settings, organization: 'not-an-id' }],
    });

    const report = await migrateLegacyDemographics(harness.source, harness.target, { apply: true });

    expect(report.enablement.skipped).toBe(8);
    expect(report.enablement.considered).toBe(0);
    expect(report.enablement.changes.every((change) => change.status === 'invalid-organization')).toBe(true);
    expect(harness.calls.setEnabled).toHaveLength(0);
  });
});
