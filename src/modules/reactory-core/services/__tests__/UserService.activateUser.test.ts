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

jest.mock('@reactory/server-modules/reactory-core/models/User', () => {
  const User: any = jest.fn();
  User.findOneAndUpdate = jest.fn();
  User.findById = jest.fn();
  User.findOne = jest.fn();
  return { __esModule: true, default: User };
});

jest.mock('@reactory/server-modules/reactory-core/models/Organization', () => ({
  __esModule: true,
  default: jest.fn(),
}));

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

const UserModel: any = require('@reactory/server-modules/reactory-core/models/User').default;

const buildService = (): UserService => {
  const context: any = {
    user: null,
    partner: { _id: new ObjectId(), name: 'reactory' },
    state: {},
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(),
  };

  return new UserService({} as any, context);
};

describe('UserService.activateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('activates a user exactly once with a conditional update', async () => {
    const userId = new ObjectId().toHexString();
    const activated = { _id: userId, email: 'ada@example.com', activatedAt: 'ignored' };

    UserModel.findOneAndUpdate.mockResolvedValue(activated);

    const result = await buildService().activateUser(userId);

    expect(result).toEqual({ user: activated, alreadyActivated: false });

    expect(UserModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = UserModel.findOneAndUpdate.mock.calls[0];

    // The condition is the idempotency guarantee: only a never-activated
    // account (null or absent field) can match.
    expect(filter).toEqual({ _id: userId, activatedAt: null });
    expect(update.$set.activatedAt).toBeInstanceOf(Date);
    expect(update.$set.updatedAt).toBeInstanceOf(Date);
    expect(options).toEqual({ new: true });

    // The lookup after a missed update is not needed when the update matched.
    expect(UserModel.findById).not.toHaveBeenCalled();
  });

  it('is idempotent: a repeat reports already activated and keeps the original timestamp', async () => {
    const userId = new ObjectId().toHexString();
    const original = new Date('2026-01-01T10:00:00.000Z');

    UserModel.findOneAndUpdate.mockResolvedValue(null);
    UserModel.findById.mockResolvedValue({
      _id: userId,
      email: 'ada@example.com',
      activatedAt: original,
    });

    const result = await buildService().activateUser(userId);

    expect(result).toBeTruthy();
    expect(result!.alreadyActivated).toBe(true);
    expect(result!.user.activatedAt).toBe(original);
  });

  it('returns null for an unknown user so the route can answer non-enumerating', async () => {
    const userId = new ObjectId().toHexString();

    UserModel.findOneAndUpdate.mockResolvedValue(null);
    UserModel.findById.mockResolvedValue(null);

    const result = await buildService().activateUser(userId);

    expect(result).toBeNull();
  });

  it('returns null without touching the database for a malformed id', async () => {
    const result = await buildService().activateUser('not-an-object-id');

    expect(result).toBeNull();
    expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(UserModel.findById).not.toHaveBeenCalled();
  });

  it('returns null for an empty id', async () => {
    const result = await buildService().activateUser('');

    expect(result).toBeNull();
    expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
