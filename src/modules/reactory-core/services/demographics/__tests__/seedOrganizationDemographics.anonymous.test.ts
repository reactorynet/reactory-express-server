import { ObjectId } from 'mongodb';
import { seedOrganizationDemographics } from '../seedOrganizationDemographics';
import { DemographicsService } from '../../DemographicsService';
import { BASE_DEMOGRAPHIC_TEMPLATES } from '../baseDemographicTemplates';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

/**
 * REGRESSION (reviewer F1, round 2): seeding must work for an *anonymous*
 * context.
 *
 * `UserService.selfRegister` creates the organization for a caller who is not
 * yet a user, so `context.user` is null on that path. `DemographicsService`'s
 * `resolveActorId` throws for a null user - correct for the configuration
 * mutations, fatal here - and because the seeding seam is best-effort the throw
 * was swallowed and the tenant silently received *no* definitions.
 *
 * These tests deliberately do NOT mock `DemographicsService`: they drive the
 * real service through the real `seedOrganizationDemographics` helper with
 * `user: null`, exactly as self-registration does, and assert the documents that
 * reach the model. A mock of the service would have hidden the bug entirely.
 *
 * Only the persistence layer is faked (no MongoDB in a unit test). The fake
 * enforces the same unique `(organization, key)` rule the schema declares.
 */
jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const { ObjectId: MockObjectId } = require('mongodb');

  const definitions: any[] = [];
  const writeAttempts: number[] = [];

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
      required: false,
      ...doc,
    };

    document.set = jest.fn((path: string, value: any) => {
      document[path] = value;
    });

    document.save = jest.fn(async () => {
      writeAttempts.push(Date.now());
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
  Organization.find = jest.fn(() => Promise.resolve([]));

  return {
    DemographicDefinition,
    DemographicValue,
    OrganizationDemographicsPolicy,
    Organization,
    definitions,
    writeAttempts,
  };
});

const models: any = require('@reactory/server-modules/reactory-core/models');
const logging: any = require('@reactory/server-core/logging');

const EXPECTED_COUNT = BASE_DEMOGRAPHIC_TEMPLATES.length;

/**
 * The context shape `UserService.selfRegister` runs with: an authenticated
 * partner (the tenant the user is registering into) but no user yet.
 */
const makeAnonymousContext = (service: DemographicsService): any => ({
  user: null,
  partner: { _id: new ObjectId() },
  state: {},
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getService: jest.fn(() => service),
});

describe('seedOrganizationDemographics with an anonymous context (ORG-030 regression)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.definitions.length = 0;
    models.writeAttempts.length = 0;
  });

  it('creates the full base set for a user: null context and reports success', async () => {
    // The real service, constructed exactly as the ServiceManager would.
    const service = new DemographicsService({}, {} as any);
    const context = makeAnonymousContext(service);
    const organizationId = new ObjectId().toHexString();

    const seeded = await seedOrganizationDemographics(organizationId, context);

    expect(seeded).toBe(true);
    // No failure was logged - the previous defect surfaced here as a warning.
    expect(logging.warn).not.toHaveBeenCalled();

    expect(models.definitions).toHaveLength(EXPECTED_COUNT);
    expect(models.definitions.map((document: any) => `${document.key}`.toLowerCase()).sort())
      .toEqual([...BASE_DEMOGRAPHIC_TEMPLATES]
        .map((template) => template.key.toLowerCase())
        .sort());
  });

  it('writes every definition as an enabled system definition owned by the organization', async () => {
    const service = new DemographicsService({}, {} as any);
    const context = makeAnonymousContext(service);
    const organizationId = new ObjectId().toHexString();

    await seedOrganizationDemographics(organizationId, context);

    expect(models.definitions).toHaveLength(EXPECTED_COUNT);
    models.definitions.forEach((document: any) => {
      expect(document.system).toBe(true);
      expect(document.deleted).toBe(false);
      expect(document.enabled).toBe(true);
      expect(`${document.organization}`).toBe(organizationId);
    });
  });

  it('leaves createdBy unattributed rather than throwing or inventing an actor', async () => {
    const service = new DemographicsService({}, {} as any);
    const context = makeAnonymousContext(service);
    const organizationId = new ObjectId().toHexString();

    await seedOrganizationDemographics(organizationId, context);

    models.definitions.forEach((document: any) => {
      expect(document.createdBy).toBeUndefined();
      expect(document.updatedBy).toBeUndefined();
    });
  });

  it('is still idempotent for an anonymous context', async () => {
    const service = new DemographicsService({}, {} as any);
    const context = makeAnonymousContext(service);
    const organizationId = new ObjectId().toHexString();

    expect(await seedOrganizationDemographics(organizationId, context)).toBe(true);
    expect(await seedOrganizationDemographics(organizationId, context)).toBe(true);

    expect(models.definitions).toHaveLength(EXPECTED_COUNT);
    expect(logging.warn).not.toHaveBeenCalled();
  });

  it('still attributes the definitions when the context does have a user', async () => {
    const service = new DemographicsService({}, {} as any);
    const actorId = new ObjectId();
    const context: any = {
      ...makeAnonymousContext(service),
      user: { _id: actorId, memberships: [], hasRole: jest.fn(() => true) },
    };
    const organizationId = new ObjectId().toHexString();

    await seedOrganizationDemographics(organizationId, context);

    expect(models.definitions).toHaveLength(EXPECTED_COUNT);
    models.definitions.forEach((document: any) => {
      expect(`${document.createdBy}`).toBe(`${actorId}`);
    });
  });

  it('honours an explicit actorId even when the context user is null', async () => {
    const service = new DemographicsService({}, {} as any);
    const context = makeAnonymousContext(service);
    const actorId = new ObjectId();
    const organizationId = new ObjectId().toHexString();

    await service.seedForOrganization(organizationId, { executionContext: context, actorId });

    expect(models.definitions).toHaveLength(EXPECTED_COUNT);
    models.definitions.forEach((document: any) => {
      expect(`${document.createdBy}`).toBe(`${actorId}`);
    });
  });
});
