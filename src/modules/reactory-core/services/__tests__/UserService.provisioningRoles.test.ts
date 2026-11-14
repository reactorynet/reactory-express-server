import { ObjectId } from 'mongodb';
import UserService from '../UserService';

/**
 * SECURITY — `UserService.createUserForOrganization` must not copy membership
 * roles onto the user document.
 *
 * It used to union every grant into `user.roles`. Combined with
 * `User.hasRole`'s document-level fallback that turned "ADMIN of partner B"
 * into "ADMIN of every partner". The grant now lives only in the membership.
 */

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/data', () => ({ clients: [] }));

jest.mock('@reactory/server-modules/reactory-core/models/User', () => {
  const User: any = jest.fn((doc: any) => {
    const { ObjectId: MockObjectId } = require('mongodb');
    const user: any = { _id: new MockObjectId(), memberships: [], roles: [], ...doc };
    user.setPassword = jest.fn(async () => undefined);
    user.save = jest.fn(async () => user);
    user.markModified = jest.fn();
    return user;
  });
  User.findOne = jest.fn(() => Promise.resolve(null));
  User.updateOne = jest.fn(() => Promise.resolve({}));
  return { __esModule: true, default: User };
});

jest.mock('@reactory/server-modules/reactory-core/models/Organization', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@reactory/server-modules/reactory-core/models/ReactoryClient', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@reactory/server-modules/reactory-core/models/Region', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@reactory/server-modules/reactory-core/models/Team', () => ({ __esModule: true, default: jest.fn() }));

const UserModel: any = require('@reactory/server-modules/reactory-core/models/User').default;

const PARTNER_B = { _id: new ObjectId(), name: 'Partner B' } as any;

const makeService = () => {
  const context: any = {
    user: { _id: new ObjectId() },
    partner: PARTNER_B,
    state: {},
    hasRole: () => true,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(() => undefined),
  };
  return new UserService({} as any, context);
};

const existingUser = (roles: string[]) => {
  const user: any = {
    _id: new ObjectId(),
    email: 'existing@example.com',
    roles: [...roles],
    memberships: [],
    save: jest.fn(async () => user),
    markModified: jest.fn(),
  };
  return user;
};

describe('UserService.createUserForOrganization — document roles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records an ADMIN grant on the membership only, leaving the document roles untouched', async () => {
    const user = existingUser(['USER']);
    UserModel.findOne.mockResolvedValueOnce(user);

    const result = await makeService().createUserForOrganization(
      { email: user.email } as any, 'pw', null, ['ADMIN'], 'LOCAL', PARTNER_B, null,
    );

    expect(result.errors).toEqual([]);
    expect(user.roles).toEqual(['USER']);
    const membership = user.memberships.find((m: any) => String(m.clientId) === String(PARTNER_B._id));
    expect(membership.roles).toEqual(expect.arrayContaining(['ADMIN', 'USER']));
    const persisted = UserModel.updateOne.mock.calls[0][1].$set;
    expect(persisted.roles).toEqual(['USER']);
  });

  it('gives a brand-new user an empty document role list (memberships carry the roles)', async () => {
    const result = await makeService().createUserForOrganization(
      { email: 'new@example.com', firstName: 'New', lastName: 'User' } as any, 'pw', null, ['ADMIN'], 'LOCAL', PARTNER_B, null,
    );

    expect(result.user.roles).toEqual([]);
    expect((result.user.memberships[0] as any).roles).toEqual(expect.arrayContaining(['ADMIN', 'USER']));
  });
});
