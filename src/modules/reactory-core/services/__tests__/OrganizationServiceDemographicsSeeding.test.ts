import { ObjectId } from 'mongodb';
import { OrganizationService } from '../OrganizationService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

/**
 * ORG-030: organization creation must seed the base demographic set through
 * `DemographicsService`, after the organization document is persisted, and a
 * seeding failure must never fail the create.
 *
 * The models are faked (no MongoDB) and `events` records the order of the two
 * observable writes (`save` then `seed`), which is the property the ticket
 * calls out explicitly.
 */
jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const { ObjectId: MockObjectId } = require('mongodb');

  const createdOrganizations: any[] = [];
  const events: string[] = [];

  const Organization: any = jest.fn((doc: any) => {
    const organization: any = { _id: new MockObjectId(), ...doc };
    organization.save = jest.fn(async () => {
      events.push('save');
    });
    createdOrganizations.push(organization);
    return organization;
  });
  Organization.findById = jest.fn();
  Organization.findOne = jest.fn();
  Organization.find = jest.fn();
  Organization.count = jest.fn();
  Organization.countDocuments = jest.fn();

  const Team: any = jest.fn();
  Team.count = jest.fn();
  Team.find = jest.fn();
  Team.findById = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();

  return { Organization, Team, BusinessUnit, User, createdOrganizations, events };
});

const models: any = require('@reactory/server-modules/reactory-core/models');
const logging: any = require('@reactory/server-core/logging');

const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

const makeContext = (getService: (serviceId: string) => any): any => {
  const context: any = {
    user: {
      _id: new ObjectId(),
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      memberships: [],
    },
    partner: { _id: new ObjectId() },
    state: {},
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(getService),
  };
  // The `@roles` decorator resolves roles through `context.hasRole(role)`.
  context.hasRole = jest.fn(() => true);
  return context;
};

const makeService = (context: any): OrganizationService => new OrganizationService({}, context);

const makeSeedMock = () =>
  jest.fn(async (organizationId: string) => {
    models.events.push('seed');
    return { organizationId, created: [], existing: [], deleted: [] };
  });

describe('OrganizationService base demographics seeding (ORG-030)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.createdOrganizations.length = 0;
    models.events.length = 0;
  });

  it('seeds the base demographic set after the organization document is persisted', async () => {
    const seedForOrganization = makeSeedMock();
    const context = makeContext(() => ({ seedForOrganization }));
    const service = makeService(context);

    const organization: any = await service.create('Acme Holdings', undefined, context);

    expect(organization.name).toBe('Acme Holdings');
    // Persist first, seed second: a seed failure must not leave an unsaved org.
    expect(models.events).toEqual(['save', 'seed']);
    expect(context.getService).toHaveBeenCalledWith(DEMOGRAPHICS_SERVICE_ID);
    expect(seedForOrganization).toHaveBeenCalledTimes(1);
    expect(seedForOrganization).toHaveBeenCalledWith(`${organization._id}`, { executionContext: context });
  });

  it('still creates the organization when seeding fails, and logs the failure', async () => {
    const seedForOrganization = jest.fn().mockRejectedValue(new Error('demographics store unavailable'));
    const context = makeContext(() => ({ seedForOrganization }));
    const service = makeService(context);

    const organization: any = await service.create('Acme Holdings', undefined, context);

    expect(organization).toBeDefined();
    expect(`${organization.name}`).toBe('Acme Holdings');
    expect(models.createdOrganizations).toHaveLength(1);
    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Seeding the base demographic templates .* failed: demographics store unavailable/),
    );
  });

  it('still creates the organization when the demographics service is not registered', async () => {
    const context = makeContext(() => undefined);
    const service = makeService(context);

    await expect(service.create('Acme Holdings', undefined, context)).resolves.toBeDefined();

    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Demographics service \[core\.DemographicsService@1\.0\.0\] is not available/),
    );
  });

  it('still creates the organization when resolving the service throws', async () => {
    const context = makeContext(() => {
      throw new Error('service manager offline');
    });
    const service = makeService(context);

    await expect(service.create('Acme Holdings', undefined, context)).resolves.toBeDefined();

    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/failed: service manager offline/),
    );
  });

  it('does not seed when organization creation itself is rejected', async () => {
    const seedForOrganization = makeSeedMock();
    const context = makeContext(() => ({ seedForOrganization }));
    const service = makeService(context);

    await expect(service.create('   ', undefined, context)).rejects.toThrow(/name is required/i);

    expect(seedForOrganization).not.toHaveBeenCalled();
    expect(models.events).toEqual([]);
    expect(models.createdOrganizations).toHaveLength(0);
  });
});
