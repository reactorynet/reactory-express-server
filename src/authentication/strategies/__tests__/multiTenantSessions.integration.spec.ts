/**
 * End-to-end tests for Reactory's multi-tenant session model.
 *
 * These drive the real login path (`LocalStrategy` → `Helpers.generateLoginToken`)
 * and the real request path (`JWTStrategy` → `SecurityService.validateSession`)
 * against in-memory stand-ins for Mongo and Redis. Nothing about session
 * handling is stubbed out: the strategies, the helpers, the service and the
 * shared session rules all run as they do in production, so these tests fail if
 * any one of them stops agreeing with the others.
 *
 * The scenarios are the ones a user would describe:
 *
 *   - signing into a second application must not sign you out of the first
 *   - signing in twice from the same browser must not pile up sessions, and must
 *     hand back the same token
 *   - signing in from a second device must get its own session
 *   - a token issued for one application must not work on another
 */

import jwt from 'jwt-simple';

// ─── In-memory Mongo ────────────────────────────────────────────────────────

interface FakeUser {
  _id: any;
  email: string;
  firstName: string;
  lastName: string;
  memberships: any[];
  sessionInfo: any[];
  lastLogin?: Date | number;
  password?: string;
}

const db: { users: FakeUser[] } = { users: [] };

const idOf = (value: any) => (value && typeof value === 'object' ? value.toString() : String(value));

const findUserById = (id: any) => db.users.find((u) => idOf(u._id) === idOf(id));

/** Mongoose document surface the auth code relies on. */
const decorate = (user: FakeUser) => ({
  ...user,
  sessionInfo: user.sessionInfo,
  memberships: user.memberships,
  validatePassword: (password: string) => password === user.password,
  hasRole: () => false,
  save: jest.fn(async function save(this: any) {
    const stored = findUserById(user._id);
    if (stored) {
      // A real document save rewrites every field it holds, sessionInfo included.
      stored.sessionInfo = this.sessionInfo;
      stored.memberships = this.memberships;
    }
    return this;
  }),
});

const applyUpdate = (user: FakeUser, update: any, filter: any = {}) => {
  if (update.$pull?.sessionInfo?.id?.$in) {
    const ids: string[] = update.$pull.sessionInfo.id.$in;
    user.sessionInfo = user.sessionInfo.filter((s) => !ids.includes(s.id));
  }
  if (update.$push?.sessionInfo) {
    user.sessionInfo.push(clone(update.$push.sessionInfo));
  }
  if (update.$set) {
    Object.entries(update.$set).forEach(([path, value]) => {
      if (path === 'sessionInfo') {
        user.sessionInfo = clone(value as any[]);
      } else if (path === 'memberships.$.lastLogin') {
        const clientId = filter['memberships.clientId'];
        const membership = user.memberships.find((m) => idOf(m.clientId) === idOf(clientId));
        if (membership) membership.lastLogin = value;
      } else {
        (user as any)[path] = value;
      }
    });
  }
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const query = (result: any) => ({
  exec: async () => result,
  select: () => ({ lean: () => ({ exec: async () => clone(result) }) }),
  then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  catch: (reject: any) => Promise.resolve(result).catch(reject),
});

const mockUserModel = {
  findById: jest.fn((id: any) => {
    const user = findUserById(id);
    return query(user ? decorate(user) : null);
  }),
  findOne: jest.fn((criteria: any) => {
    const user = db.users.find((u) => u.email === criteria?.email);
    return query(user ? decorate(user) : null);
  }),
  find: jest.fn(() => query([])),
  updateOne: jest.fn((filter: any, update: any) => ({
    exec: async () => {
      const user = findUserById(filter._id);
      if (!user) return { acknowledged: true, modifiedCount: 0 };
      applyUpdate(user, update, filter);
      return { acknowledged: true, modifiedCount: 1 };
    },
  })),
};

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: mockUserModel,
  PostgresDataSource: {
    getRepository: () => ({ save: jest.fn(), createQueryBuilder: jest.fn() }),
  },
}));

jest.mock('@reactory/server-modules/reactory-core/models/UserSession', () => ({
  __esModule: true,
  default: class UserSession {},
}));

jest.mock('@reactory/server-core/amq', () => ({ raiseWorkFlowEvent: jest.fn() }));

jest.mock('../telemetry', () => ({
  recordAttempt: jest.fn(),
  recordFailure: jest.fn(),
  recordSuccess: jest.fn(),
  recordTokenGeneration: jest.fn(),
}));

import LocalStrategy from '../LocalStrategy';
import JWTStrategy from '../JWTStrategy';
import { SecurityService } from '@reactory/server-modules/reactory-core/services/SecurityService/SecurityService';
import { sessionCacheKey } from '@reactory/server-modules/reactory-core/services/SecurityService/sessions';

// ─── In-memory Redis ────────────────────────────────────────────────────────

const createFakeRedis = () => {
  const store = new Map<string, any>();
  return {
    store,
    getJSON: jest.fn(async (key: string) => (store.has(key) ? clone(store.get(key)) : null)),
    setJSON: jest.fn(async (key: string, value: any) => {
      store.set(key, clone(value));
      return 'OK' as const;
    }),
    del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  };
};

// ─── Harness ────────────────────────────────────────────────────────────────

const USER_ID = '507f1f77bcf86cd799439011';
const PARTNER_A = { _id: '507f1f77bcf86cd7994390a1', key: 'partner-a' };
const PARTNER_B = { _id: '507f1f77bcf86cd7994390b2', key: 'partner-b' };
const PASSWORD = 'correct-horse';

let redis: ReturnType<typeof createFakeRedis>;
let securityService: SecurityService;

const buildContext = (partner: any) => ({
  partner,
  user: null,
  getService: jest.fn((id: string) =>
    id === 'core.SecurityService@1.0.0' ? securityService : null
  ),
  debug: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  hasRole: jest.fn(() => false),
});

/** Sign in through the real local strategy and return the issued token. */
const login = async (partner: any, ip: string): Promise<string> => {
  const context = buildContext(partner);
  const request: any = { context, ip, headers: {}, query: {} };

  const result = await new Promise<any>((resolve, reject) => {
    (LocalStrategy as any)._verify(
      request,
      'user@example.com',
      PASSWORD,
      (err: any, user: any, info: any) => (err ? reject(err) : resolve({ user, info }))
    );
  });

  if (!result.user) throw new Error(`login failed: ${result.info?.message}`);
  return result.user.token;
};

/** Present a token to the real JWT strategy, as a request to `partner` would. */
const authenticate = async (token: string, partner: any): Promise<any | false> => {
  const context = buildContext(partner);
  const request: any = { context, headers: {}, query: {} };
  const payload = jwt.decode(token, process.env.SECRET_SAUCE as string);

  const outcome = await new Promise<any>((resolve, reject) => {
    (JWTStrategy as any)._verify(request, payload, (err: any, user: any) =>
      err ? reject(err) : resolve(user)
    );
  });

  return outcome;
};

const storedSessions = () => findUserById(USER_ID)!.sessionInfo;
const clientsOf = () => storedSessions().map((s: any) => s.client).sort();
const refreshOf = (token: string) =>
  (jwt.decode(token, process.env.SECRET_SAUCE as string) as any).refresh;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REACTORY_SESSION_REUSE;
  delete process.env.REACTORY_MAX_SESSIONS_PER_CLIENT;
  delete process.env.REACTORY_MAX_TOTAL_SESSIONS;

  db.users = [
    {
      _id: USER_ID,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: PASSWORD,
      memberships: [
        { clientId: PARTNER_A._id, lastLogin: null, enabled: true, roles: ['USER'] },
        { clientId: PARTNER_B._id, lastLogin: null, enabled: true, roles: ['USER'] },
      ],
      sessionInfo: [],
    },
  ];

  redis = createFakeRedis();
  securityService = new SecurityService(
    { dependencies: { redisService: redis } } as any,
    buildContext(PARTNER_A) as any
  );
});

describe('signing into a second application', () => {
  it('leaves the first application\'s token working', async () => {
    const tokenA = await login(PARTNER_A, '10.0.0.1');
    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();

    const tokenB = await login(PARTNER_B, '10.0.0.1');

    // This is the regression the whole feature exists for.
    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();
    expect(await authenticate(tokenB, PARTNER_B)).toBeTruthy();
  });

  it('keeps a session for each application on the user document', async () => {
    await login(PARTNER_A, '10.0.0.1');
    await login(PARTNER_B, '10.0.0.1');

    expect(clientsOf()).toEqual(['partner-a', 'partner-b']);
  });

  it('issues a different token per application', async () => {
    const tokenA = await login(PARTNER_A, '10.0.0.1');
    const tokenB = await login(PARTNER_B, '10.0.0.1');

    expect(tokenA).not.toBe(tokenB);
    expect(refreshOf(tokenA)).not.toBe(refreshOf(tokenB));
  });

  it('survives repeated back-and-forth logins between two applications', async () => {
    const tokenA = await login(PARTNER_A, '10.0.0.1');
    const tokenB = await login(PARTNER_B, '10.0.0.1');

    for (let i = 0; i < 3; i += 1) {
      await login(PARTNER_A, '10.0.0.1');
      await login(PARTNER_B, '10.0.0.1');
    }

    expect(clientsOf()).toEqual(['partner-a', 'partner-b']);
    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();
    expect(await authenticate(tokenB, PARTNER_B)).toBeTruthy();
  });

  it('keeps both sessions when the two logins race', async () => {
    const [tokenA, tokenB] = await Promise.all([
      login(PARTNER_A, '10.0.0.1'),
      login(PARTNER_B, '10.0.0.2'),
    ]);

    expect(clientsOf()).toEqual(['partner-a', 'partner-b']);
    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();
    expect(await authenticate(tokenB, PARTNER_B)).toBeTruthy();
  });
});

describe('signing in again to the same application', () => {
  it('hands back the same token from the same host', async () => {
    const first = await login(PARTNER_A, '10.0.0.1');
    const second = await login(PARTNER_A, '10.0.0.1');

    expect(second).toBe(first);
    expect(storedSessions()).toHaveLength(1);
  });

  it('keeps the reissued token working', async () => {
    const first = await login(PARTNER_A, '10.0.0.1');
    const second = await login(PARTNER_A, '10.0.0.1');

    expect(await authenticate(first, PARTNER_A)).toBeTruthy();
    expect(await authenticate(second, PARTNER_A)).toBeTruthy();
  });

  it('does not pile up sessions across many logins', async () => {
    for (let i = 0; i < 10; i += 1) {
      await login(PARTNER_A, '10.0.0.1');
    }

    expect(storedSessions()).toHaveLength(1);
  });

  it('mints a new session per host, so a second device gets its own', async () => {
    const laptop = await login(PARTNER_A, '10.0.0.1');
    const phone = await login(PARTNER_A, '10.0.0.2');

    expect(phone).not.toBe(laptop);
    expect(storedSessions()).toHaveLength(2);
    expect(await authenticate(laptop, PARTNER_A)).toBeTruthy();
    expect(await authenticate(phone, PARTNER_A)).toBeTruthy();
  });

  it('mints a new session on every login when reuse is switched off', async () => {
    process.env.REACTORY_SESSION_REUSE = 'false';

    const first = await login(PARTNER_A, '10.0.0.1');
    const second = await login(PARTNER_A, '10.0.0.1');

    expect(second).not.toBe(first);
    expect(storedSessions()).toHaveLength(2);
    expect(await authenticate(first, PARTNER_A)).toBeTruthy();
    expect(await authenticate(second, PARTNER_A)).toBeTruthy();
  });
});

describe('tokens are scoped to the application they were issued for', () => {
  it('refuses a token from application A on application B', async () => {
    const tokenA = await login(PARTNER_A, '10.0.0.1');

    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();
    expect(await authenticate(tokenA, PARTNER_B)).toBe(false);
  });

  it('refuses it even once the user is signed into both', async () => {
    const tokenA = await login(PARTNER_A, '10.0.0.1');
    await login(PARTNER_B, '10.0.0.1');

    expect(await authenticate(tokenA, PARTNER_B)).toBe(false);
  });

  it('records the mismatch as its own failure reason', async () => {
    const AuthTelemetry = require('../telemetry');
    const tokenA = await login(PARTNER_A, '10.0.0.1');
    AuthTelemetry.recordFailure.mockClear();

    await authenticate(tokenA, PARTNER_B);

    expect(AuthTelemetry.recordFailure).toHaveBeenCalledWith(
      'jwt',
      'partner-b',
      'session_client_mismatch',
      expect.any(Number)
    );
  });
});

describe('a fresh token is honoured even while a stale cache is warm', () => {
  it('accepts a token issued after the cache was populated', async () => {
    // Warm the cache for this user against partner-b, so it knows nothing of the
    // partner-a session that follows.
    const tokenB = await login(PARTNER_B, '10.0.0.1');
    await authenticate(tokenB, PARTNER_B);
    expect(redis.store.has(sessionCacheKey(USER_ID))).toBe(true);

    // Stop invalidation from running, to prove the fall-through is what saves us
    // rather than the cache being cleared.
    redis.del.mockImplementation(async () => 0);

    const tokenA = await login(PARTNER_A, '10.0.0.1');
    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();
  });

  it('still refuses a token that was never issued', async () => {
    const tokenB = await login(PARTNER_B, '10.0.0.1');
    await authenticate(tokenB, PARTNER_B);

    const forged = jwt.encode(
      {
        userId: USER_ID,
        exp: Date.now() + 3600_000,
        iat: Date.now(),
        refresh: 'never-issued',
        sid: 'never-existed',
      },
      process.env.SECRET_SAUCE as string
    );

    expect(await authenticate(forged, PARTNER_B)).toBe(false);
  });
});

describe('session revocation', () => {
  it('stops every token for the user once sessions are expired', async () => {
    const tokenA = await login(PARTNER_A, '10.0.0.1');
    const tokenB = await login(PARTNER_B, '10.0.0.1');
    expect(await authenticate(tokenA, PARTNER_A)).toBeTruthy();

    await securityService.expireTokens({ userId: USER_ID, reason: 'test' });

    expect(await authenticate(tokenA, PARTNER_A)).toBe(false);
    expect(await authenticate(tokenB, PARTNER_B)).toBe(false);
  });

  it('lets the user sign in again afterwards', async () => {
    await login(PARTNER_A, '10.0.0.1');
    await securityService.expireTokens({ userId: USER_ID, reason: 'test' });

    const fresh = await login(PARTNER_A, '10.0.0.1');
    expect(await authenticate(fresh, PARTNER_A)).toBeTruthy();
  });
});

describe('out-of-band tokens', () => {
  it('honours a token minted without a session, such as a password-reset link', async () => {
    // Sign in first, so the user does have sessions - the point is that a token
    // carrying no `sid` is not measured against them.
    await login(PARTNER_A, '10.0.0.1');

    const Helpers = require('../helpers').default;
    const resetToken = Helpers.getJwtTokenForUser(decorate(findUserById(USER_ID)!) as any);

    expect(await authenticate(resetToken, PARTNER_A)).toBeTruthy();
  });

  it('honours it on any application, since it is not scoped to one', async () => {
    await login(PARTNER_A, '10.0.0.1');

    const Helpers = require('../helpers').default;
    const linkToken = Helpers.getJwtTokenForUser(decorate(findUserById(USER_ID)!) as any);

    expect(await authenticate(linkToken, PARTNER_B)).toBeTruthy();
  });
});

describe('session caps', () => {
  it('evicts the oldest session for an application past its cap', async () => {
    process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = '2';

    const first = await login(PARTNER_A, '10.0.0.1');
    const second = await login(PARTNER_A, '10.0.0.2');
    const third = await login(PARTNER_A, '10.0.0.3');

    expect(storedSessions()).toHaveLength(2);
    expect(await authenticate(first, PARTNER_A)).toBe(false);
    expect(await authenticate(second, PARTNER_A)).toBeTruthy();
    expect(await authenticate(third, PARTNER_A)).toBeTruthy();
  });

  it('does not let one application\'s cap evict another\'s session', async () => {
    process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = '1';

    const tokenB = await login(PARTNER_B, '10.0.0.1');
    await login(PARTNER_A, '10.0.0.2');
    await login(PARTNER_A, '10.0.0.3');

    expect(await authenticate(tokenB, PARTNER_B)).toBeTruthy();
    expect(clientsOf()).toEqual(['partner-a', 'partner-b']);
  });
});

describe('login bookkeeping', () => {
  it('records the login against the membership for that application', async () => {
    await login(PARTNER_A, '10.0.0.1');

    const user = findUserById(USER_ID)!;
    const membershipA = user.memberships.find((m) => idOf(m.clientId) === idOf(PARTNER_A._id));
    const membershipB = user.memberships.find((m) => idOf(m.clientId) === idOf(PARTNER_B._id));

    expect(membershipA.lastLogin).toBeInstanceOf(Date);
    expect(membershipB.lastLogin).toBeNull();
  });

  it('records the host the session was opened from', async () => {
    await login(PARTNER_A, '10.0.0.7');

    expect(storedSessions()[0].host).toBe('10.0.0.7');
  });

  it('stores the signed payload so the token can be reissued verbatim', async () => {
    const token = await login(PARTNER_A, '10.0.0.1');
    const stored = storedSessions()[0];

    expect(jwt.encode(JSON.parse(stored.jwtPayloadJson), process.env.SECRET_SAUCE as string)).toBe(
      token
    );
  });
});
