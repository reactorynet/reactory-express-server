import { ObjectId } from 'mongodb';
import UserService from '../UserService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// `clients` is loaded from YAML client configs at import time; irrelevant here.
jest.mock('@reactory/server-core/data', () => ({ clients: [] }));

/**
 * ORG-030 revision: `UserService.selfRegister` is the *second* organization
 * creation path in the codebase. It writes the organization through the model
 * (an anonymous caller cannot pass `OrganizationService`'s ADMIN/SYSTEM guard),
 * so `OrganizationService.create`'s seeding hook never runs for it. These tests
 * pin the seeding seam on this path: it must seed exactly when it creates an
 * organization, and a seeding failure must never fail the registration.
 *
 * The models are in-memory fakes. `events` records the observable order of the
 * two writes (`save` then `seed`), which is the property that matters: seeding
 * before the organization exists would seed a document that may never be
 * persisted.
 */
jest.mock('@reactory/server-modules/reactory-core/models/Organization', () => {
  const { ObjectId: MockObjectId } = require('mongodb');

  const created: any[] = [];
  const events: string[] = [];

  const Organization: any = jest.fn((doc: any) => {
    const organization: any = { _id: new MockObjectId(), ...doc };
    organization.save = jest.fn(async () => {
      events.push('save');
      return organization;
    });
    created.push(organization);
    return organization;
  });

  Organization.findOne = jest.fn(() => Promise.resolve(null));
  Organization.findById = jest.fn(() => Promise.resolve(null));

  return { __esModule: true, default: Organization, created, events };
});

jest.mock('@reactory/server-modules/reactory-core/models/User', () => {
  const { ObjectId: MockObjectId } = require('mongodb');

  const created: any[] = [];

  const User: any = jest.fn((doc: any) => {
    const user: any = {
      _id: new MockObjectId(),
      memberships: [],
      ...doc,
    };
    user.setPassword = jest.fn(async () => undefined);
    user.save = jest.fn(async () => user);
    created.push(user);
    return user;
  });

  // No existing username, no existing email: a clean registration.
  User.findOne = jest.fn(() => Promise.resolve(null));

  return { __esModule: true, default: User, created };
});

jest.mock('@reactory/server-modules/reactory-core/models/ReactoryClient', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models/Region', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models/Team', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const organizationModule: any = require('@reactory/server-modules/reactory-core/models/Organization');
const userModule: any = require('@reactory/server-modules/reactory-core/models/User');
const OrganizationModel: any = organizationModule.default;
const UserModel: any = userModule.default;
const userModels: any = require('@reactory/server-modules/reactory-core/models/User');
const logging: any = require('@reactory/server-core/logging');

const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

const makePartner = (): any => ({ _id: new ObjectId(), name: 'reactory' });

/** Builds a service whose context resolves `service` for the demographics id. */
const makeService = (service: any): UserService => {
  const context: any = {
    user: null,
    partner: makePartner(),
    state: {},
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getService: jest.fn((id: string) => (id === DEMOGRAPHICS_SERVICE_ID ? service : undefined)),
  };

  return new UserService({} as any, context);
};

const registration = () => ({
  userInput: {
    email: 'founder@example.com',
    password: 'Sup3r-secret!',
    firstName: 'Founder',
    lastName: 'Person',
  } as any,
  organizationInput: { name: 'Founder Holdings' } as any,
  partner: makePartner(),
});

const makeSeedMock = () =>
  jest.fn(async (organizationId: string) => {
    organizationModule.events.push('seed');
    return { organizationId, created: [], existing: [], deleted: [] };
  });

describe('UserService.selfRegister base demographics seeding (ORG-030)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    organizationModule.created.length = 0;
    organizationModule.events.length = 0;
    userModule.created.length = 0;
    OrganizationModel.findOne.mockResolvedValue(null);
  });

  it('seeds the base demographic set when self-registration creates the organization', async () => {
    const seedForOrganization = makeSeedMock();
    const service = makeService({ seedForOrganization });
    const { userInput, organizationInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, organizationInput, partner);

    const organizationId = `${result.organization._id}`;

    // Persist first, seed second.
    expect(organizationModule.events).toEqual(['save', 'seed']);
    expect(seedForOrganization).toHaveBeenCalledTimes(1);
    expect(seedForOrganization).toHaveBeenCalledWith(organizationId, {
      executionContext: expect.objectContaining({ getService: expect.any(Function) }),
    });
    expect(logging.warn).not.toHaveBeenCalled();
  });

  it('seeds before the user document is written, and still completes the registration', async () => {
    const seedForOrganization = makeSeedMock();
    const service = makeService({ seedForOrganization });
    const { userInput, organizationInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, organizationInput, partner);

    expect(result.user).toBeDefined();
    expect(result.user.memberships).toHaveLength(2);
    expect(result.organization).toBeDefined();
    expect(seedForOrganization).toHaveBeenCalledTimes(1);
  });

  it('does not seed when self-registration joins an existing organization', async () => {
    const existingOrganization = { _id: new ObjectId(), name: 'Existing Co' };
    OrganizationModel.findOne.mockResolvedValue(existingOrganization);

    const seedForOrganization = makeSeedMock();
    const service = makeService({ seedForOrganization });
    const { userInput, organizationInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, organizationInput, partner);

    expect(result.organization).toBe(existingOrganization);
    expect(seedForOrganization).not.toHaveBeenCalled();
    expect(organizationModule.events).toEqual([]);
  });

  it('still registers the user when seeding fails, and logs the failure', async () => {
    const seedForOrganization = jest.fn().mockRejectedValue(new Error('demographics store offline'));
    const service = makeService({ seedForOrganization });
    const { userInput, organizationInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, organizationInput, partner);

    expect(result.user).toBeDefined();
    expect(`${result.user.email}`).toBe('founder@example.com');
    expect(result.organization).toBeDefined();
    // The user was created despite the seed failure.
    expect(userModule.created).toHaveLength(1);

    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Seeding the base demographic templates .* failed: demographics store offline/),
    );
  });

  it('still registers the user when the demographics service is not registered', async () => {
    const service = makeService(undefined);
    const { userInput, organizationInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, organizationInput, partner);

    expect(result.user).toBeDefined();
    expect(result.organization).toBeDefined();
    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /Demographics service \[core\.DemographicsService@1\.0\.0\] is not available/,
      ),
    );
  });

  it('still registers the user when resolving the demographics service throws', async () => {
    const context: any = {
      user: null,
      partner: makePartner(),
      state: {},
      log: jest.fn(),
      getService: jest.fn(() => {
        throw new Error('service manager offline');
      }),
    };
    const service = new UserService({} as any, context);
    const { userInput, organizationInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, organizationInput, partner);

    expect(result.user).toBeDefined();
    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/failed: service manager offline/),
    );
  });

  it('does not create or seed an organization when the organization is neither named nor identified', async () => {
    const seedForOrganization = makeSeedMock();
    const service = makeService({ seedForOrganization });
    const { userInput, partner } = registration();

    const result: any = await service.selfRegister(userInput, {} as any, partner);

    expect(result.organization).toBeNull();
    expect(organizationModule.created).toHaveLength(0);
    expect(seedForOrganization).not.toHaveBeenCalled();
  });
});
