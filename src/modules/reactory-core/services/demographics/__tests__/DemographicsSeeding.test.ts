import { ObjectId } from 'mongodb';
import { DemographicsService } from '../../DemographicsService';
import { BASE_DEMOGRAPHIC_TEMPLATE_KEYS } from '../baseDemographicTemplates';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

/**
 * In-memory stand-ins for the three demographics models and `Organization`.
 *
 * The real models need MongoDB, and the behaviour under test is *our* logic -
 * idempotency, resurrection, partial fills - not Mongoose. The fake keeps a
 * single collection and enforces the same unique `(organization, key)` rule the
 * schema declares, so a duplicate write fails exactly the way production would
 * (`code: 11000`) instead of quietly succeeding.
 */
jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const { ObjectId: MockObjectId } = require('mongodb');

  const definitions: any[] = [];
  const organizations: any[] = [];
  const failingOrganizations = new Set<string>();

  /** Supports the subset of Mongo query shapes the service uses. */
  const matches = (document: any, query: Record<string, any>): boolean =>
    Object.keys(query).every((field) => {
      const expected = query[field];
      const actual = document[field];

      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (Array.isArray((expected as any).$in)) {
          return (expected as any).$in.some((candidate: any) => `${candidate}` === `${actual}`);
        }
        if ('$ne' in (expected as any)) {
          return `${actual}` !== `${(expected as any).$ne}`;
        }
      }

      return `${actual}` === `${expected}`;
    });

  const DemographicDefinition: any = jest.fn((doc: any) => {
    const document: any = {
      _id: new MockObjectId(),
      system: false,
      deleted: false,
      enabled: true,
      ...doc,
    };

    document.set = jest.fn((path: string, value: any) => {
      document[path] = value;
    });

    document.save = jest.fn(async () => {
      if (failingOrganizations.has(`${document.organization}`)) {
        throw new Error('simulated definition write failure');
      }

      const duplicate = definitions.some(
        (stored) =>
          `${stored.organization}` === `${document.organization}` &&
          `${stored.key}` === `${document.key}`,
      );

      if (duplicate) {
        const error: any = new Error('E11000 duplicate key error collection');
        error.code = 11000;
        throw error;
      }

      definitions.push(document);
      return document;
    });

    return document;
  });

  DemographicDefinition.find = jest.fn((query: Record<string, any>) =>
    Promise.resolve(definitions.filter((document) => matches(document, query))));

  const DemographicValue: any = jest.fn();
  DemographicValue.find = jest.fn(() => Promise.resolve([]));
  DemographicValue.countDocuments = jest.fn(() => Promise.resolve(0));

  const OrganizationDemographicsPolicy: any = jest.fn();
  OrganizationDemographicsPolicy.findOne = jest.fn(() => Promise.resolve(null));

  const Organization: any = jest.fn();
  Organization.find = jest.fn((query: Record<string, any>) =>
    Promise.resolve(organizations.filter((document) => matches(document, query))));

  return {
    DemographicDefinition,
    DemographicValue,
    OrganizationDemographicsPolicy,
    Organization,
    definitions,
    organizations,
    failingOrganizations,
  };
});

const models: any = require('@reactory/server-modules/reactory-core/models');

const EXPECTED_KEYS = [...BASE_DEMOGRAPHIC_TEMPLATE_KEYS];

/** The persisted form: `DemographicDefinition` lower-cases `key` on write. */
const STORED_KEYS = EXPECTED_KEYS.map((key) => key.toLowerCase());

const makeService = (): DemographicsService => new DemographicsService({}, {});

const newOrganizationId = (): string => new ObjectId().toHexString();

/** Seeds one organization and returns its definitions, for post-conditions. */
const storedFor = (organizationId: string): any[] =>
  models.definitions.filter((document: any) => `${document.organization}` === organizationId);

describe('DemographicsService base set seeding (ORG-030)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.definitions.length = 0;
    models.organizations.length = 0;
    models.failingOrganizations.clear();
  });

  // ---------------------------------------------------------------------------
  // The happy path
  // ---------------------------------------------------------------------------

  it('seeds the whole base set for an organization', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    const result = await service.seedForOrganization(organizationId);

    expect(result).toEqual({
      organizationId,
      created: EXPECTED_KEYS,
      existing: [],
      deleted: [],
    });

    const stored = storedFor(organizationId);
    expect(stored).toHaveLength(EXPECTED_KEYS.length);
    expect(stored.map((document) => `${document.key}`.toLowerCase())).toEqual(STORED_KEYS);
  });

  it('writes every definition as an enabled system definition owned by the organization', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);

    storedFor(organizationId).forEach((document) => {
      expect(document.system).toBe(true);
      expect(document.deleted).toBe(false);
      expect(document.enabled).toBe(true);
      expect(document.required).toBe(false);
      expect(`${document.organization}`).toBe(organizationId);
    });
  });

  it('copies the type-specific payload (options and reference) as data', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);

    const byKey = new Map(storedFor(organizationId).map((document) => [document.key, document]));

    expect(byKey.get('gender').valueType).toBe('enum');
    expect((byKey.get('gender').options || []).map((option: any) => option.key))
      .toContain('prefer-not-to-say');

    expect(byKey.get('language').valueType).toBe('multi-enum');
    expect(byKey.get('language').multiValued).toBe(true);

    expect(byKey.get('businessunit').valueType).toBe('reference');
    expect(byKey.get('businessunit').reference).toEqual({ model: 'BusinessUnit', multiple: false });

    expect(byKey.get('race').sensitive).toBe(true);
    expect(byKey.get('gender').sensitive).toBe(false);
  });

  it('attributes the definitions to the actor when one is supplied', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();
    const actorId = new ObjectId();

    await service.seedForOrganization(organizationId, { actorId });

    storedFor(organizationId).forEach((document) => {
      expect(`${document.createdBy}`).toBe(`${actorId}`);
      expect(`${document.updatedBy}`).toBe(`${actorId}`);
    });
  });

  // ---------------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------------

  it('is idempotent: a second run creates nothing and duplicates nothing', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);
    const second = await service.seedForOrganization(organizationId);

    expect(second.created).toEqual([]);
    expect(second.existing).toEqual(EXPECTED_KEYS);

    const stored = storedFor(organizationId);
    expect(stored).toHaveLength(EXPECTED_KEYS.length);
    expect(new Set(stored.map((document) => document.key)).size).toBe(EXPECTED_KEYS.length);
  });

  it('creates only the missing definitions of a partially seeded organization', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);

    // Simulate an organization seeded before the base set grew: keep three,
    // remove the rest. The next run must fill the gaps, not re-create the three.
    const keep = ['dateOfBirth', 'gender', 'team'];
    const keepStored = new Set(keep.map((key) => key.toLowerCase()));
    models.definitions.splice(
      0,
      models.definitions.length,
      ...models.definitions.filter((document: any) => keepStored.has(`${document.key}`.toLowerCase())),
    );

    const result = await service.seedForOrganization(organizationId);

    expect(result.existing.sort()).toEqual([...keep].sort());
    expect(result.created).toHaveLength(EXPECTED_KEYS.length - keep.length);
    expect(storedFor(organizationId)).toHaveLength(EXPECTED_KEYS.length);
  });

  it('treats a concurrent duplicate write (E11000) as already seeded', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);

    // Force the pre-check to miss everything, as though another process had
    // inserted the whole set between our query and our writes.
    models.DemographicDefinition.find.mockReturnValueOnce(Promise.resolve([]));

    const result = await service.seedForOrganization(organizationId);

    expect(result.created).toEqual([]);
    expect(result.existing).toEqual(EXPECTED_KEYS);
    expect(storedFor(organizationId)).toHaveLength(EXPECTED_KEYS.length);
  });

  // ---------------------------------------------------------------------------
  // Existing definitions are the administrator's, not ours
  // ---------------------------------------------------------------------------

  it('does not resurrect a soft-deleted definition', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);

    const deleted = storedFor(organizationId).find((document) => document.key === 'race');
    deleted.deleted = true;

    const result = await service.seedForOrganization(organizationId);

    expect(result.created).toEqual([]);
    expect(result.deleted).toEqual(['race']);

    const races = storedFor(organizationId).filter((document) => document.key === 'race');
    expect(races).toHaveLength(1);
    expect(races[0].deleted).toBe(true);
    expect(storedFor(organizationId)).toHaveLength(EXPECTED_KEYS.length);
  });

  it('does not re-enable a disabled definition or overwrite an administrator\'s edits', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    await service.seedForOrganization(organizationId);

    const gender = storedFor(organizationId).find((document) => document.key === 'gender');
    gender.enabled = false;
    gender.title = 'Gender identity';
    gender.ordinal = 999;

    const result = await service.seedForOrganization(organizationId);

    expect(result.existing).toEqual(EXPECTED_KEYS);
    expect(gender.enabled).toBe(false);
    expect(gender.title).toBe('Gender identity');
    expect(gender.ordinal).toBe(999);
    expect(storedFor(organizationId)).toHaveLength(EXPECTED_KEYS.length);
  });

  it('keeps each organization\'s definitions separate', async () => {
    const service = makeService();
    const first = newOrganizationId();
    const second = newOrganizationId();

    await service.seedForOrganization(first);
    await service.seedForOrganization(second);

    expect(storedFor(first)).toHaveLength(EXPECTED_KEYS.length);
    expect(storedFor(second)).toHaveLength(EXPECTED_KEYS.length);
    expect(models.definitions).toHaveLength(EXPECTED_KEYS.length * 2);
  });

  // ---------------------------------------------------------------------------
  // Guard rails
  // ---------------------------------------------------------------------------

  it('rejects a malformed organization id instead of seeding nothing quietly', async () => {
    const service = makeService();

    await expect(service.seedForOrganization('not-an-object-id')).rejects.toThrow(/not a valid/i);
    expect(models.definitions).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Backfill
  // ---------------------------------------------------------------------------

  it('backfills every existing organization', async () => {
    const service = makeService();
    const seeded = newOrganizationId();
    const unseeded = newOrganizationId();

    await service.seedForOrganization(seeded);
    models.organizations.push(
      { _id: new ObjectId(seeded) },
      { _id: new ObjectId(unseeded) },
    );

    const summary = await service.backfillOrganizationDemographics();

    expect(summary.organizations).toBe(2);
    expect(summary.created).toBe(EXPECTED_KEYS.length);
    expect(summary.existing).toBe(EXPECTED_KEYS.length);
    expect(summary.failures).toEqual([]);

    expect(storedFor(seeded)).toHaveLength(EXPECTED_KEYS.length);
    expect(storedFor(unseeded)).toHaveLength(EXPECTED_KEYS.length);
  });

  it('backfills only the organizations that were asked for', async () => {
    const service = makeService();
    const first = newOrganizationId();
    const second = newOrganizationId();

    models.organizations.push({ _id: new ObjectId(first) }, { _id: new ObjectId(second) });

    const summary = await service.backfillOrganizationDemographics({ organizationIds: [first] });

    expect(summary.organizations).toBe(1);
    expect(storedFor(first)).toHaveLength(EXPECTED_KEYS.length);
    expect(storedFor(second)).toHaveLength(0);
  });

  it('records a failing organization and continues with the rest', async () => {
    const service = makeService();
    const healthy = newOrganizationId();
    const broken = newOrganizationId();

    models.organizations.push({ _id: new ObjectId(healthy) }, { _id: new ObjectId(broken) });
    models.failingOrganizations.add(broken);

    const summary = await service.backfillOrganizationDemographics();

    expect(summary.failures).toHaveLength(1);
    expect(summary.failures[0].organizationId).toBe(broken);
    expect(summary.failures[0].message).toMatch(/simulated definition write failure/);

    expect(storedFor(healthy)).toHaveLength(EXPECTED_KEYS.length);
    expect(storedFor(broken)).toHaveLength(0);
  });

  it('is idempotent when the backfill is re-run', async () => {
    const service = makeService();
    const organizationId = newOrganizationId();

    models.organizations.push({ _id: new ObjectId(organizationId) });

    await service.backfillOrganizationDemographics();
    const second = await service.backfillOrganizationDemographics();

    expect(second.created).toBe(0);
    expect(second.existing).toBe(EXPECTED_KEYS.length);
    expect(storedFor(organizationId)).toHaveLength(EXPECTED_KEYS.length);
  });

  it('rejects a backfill with no valid organization ids', async () => {
    const service = makeService();

    await expect(
      service.backfillOrganizationDemographics({ organizationIds: ['nope'] }),
    ).rejects.toThrow(/No valid organization ids/i);

    expect(models.Organization.find).not.toHaveBeenCalled();
  });
});
