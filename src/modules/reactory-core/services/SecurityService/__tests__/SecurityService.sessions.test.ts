/**
 * Unit tests for SecurityService session validation.
 *
 * The behaviour under test is the request hot path: given a bearer token's
 * refresh id and the application the request arrived for, decide whether a live
 * session backs it — reading Redis first, and falling back to Mongo when the
 * cache cannot settle the question.
 */

const sessionStore: { sessionInfo: any[] } = { sessionInfo: [] };

const mockFindById = jest.fn();
const mockUpdateOne = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ acknowledged: true }) }));

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    findById: (...args: any[]) => mockFindById(...args),
    findOne: jest.fn(),
    updateOne: (...args: any[]) => (mockUpdateOne as any)(...args),
    find: jest.fn(),
  },
  PostgresDataSource: {
    getRepository: jest.fn(() => ({
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    })),
  },
}));

jest.mock('@reactory/server-modules/reactory-core/models/UserSession', () => ({
  __esModule: true,
  default: class UserSession {},
}));

import { SecurityService } from '../SecurityService';
import { sessionCacheKey, SessionCacheEnvelope } from '../sessions';

const HOUR = 60 * 60 * 1000;
const USER_ID = '507f1f77bcf86cd799439011';

/** An in-memory stand-in for RedisService that records what was written. */
const createFakeRedis = () => {
  const store = new Map<string, any>();
  return {
    store,
    getJSON: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    setJSON: jest.fn(async (key: string, value: any) => {
      store.set(key, JSON.parse(JSON.stringify(value)));
      return 'OK' as const;
    }),
    del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  };
};

const mockContext: any = {
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  user: null,
};

const session = (overrides: {
  id?: string;
  client?: string;
  refresh?: string;
  exp?: number | Date | null;
  iat?: number;
} = {}) => {
  const {
    id = 'sess-1',
    client = 'partner-a',
    refresh = 'refresh-1',
    exp = Date.now() + HOUR,
    iat = Date.now(),
  } = overrides;
  return { id, client, host: '10.0.0.1', jwtPayload: { refresh, exp, iat, sid: id } };
};

/** Seed the Redis cache with an envelope, as SecurityService would have written it. */
const cacheEnvelope = (envelope: SessionCacheEnvelope) => {
  redis.store.set(sessionCacheKey(USER_ID), envelope);
};

let redis: ReturnType<typeof createFakeRedis>;
let service: SecurityService;

const buildService = (withRedis = true) => {
  redis = createFakeRedis();
  return new SecurityService(
    { dependencies: withRedis ? { redisService: redis } : {} } as any,
    mockContext
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStore.sessionInfo = [];
  mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ acknowledged: true }) });
  mockFindById.mockImplementation(() => ({
    select: () => ({
      lean: () => ({
        exec: jest.fn().mockImplementation(async () => ({
          sessionInfo: JSON.parse(JSON.stringify(sessionStore.sessionInfo)),
        })),
      }),
    }),
  }));
  service = buildService();
});

describe('validateSession — Mongo fallback', () => {
  it('validates a refresh token that a live session carries', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
  });

  it('rejects a refresh token no session carries', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];

    await expect(service.validateSession(USER_ID, 'other-token')).resolves.toBe(false);
  });

  it('rejects a token whose session has expired', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1', exp: Date.now() - 1 })];

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(false);
  });

  it('rejects everything for a user with no sessions', async () => {
    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(false);
  });

  it('rejects rather than throwing when the user cannot be read', async () => {
    mockFindById.mockImplementation(() => {
      throw new Error('mongo down');
    });

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(false);
  });

  it('populates the cache so the next validation avoids Mongo', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];
    await service.validateSession(USER_ID, 'refresh-1');

    const cached: SessionCacheEnvelope = redis.store.get(sessionCacheKey(USER_ID));
    expect(cached.sessions).toEqual([
      expect.objectContaining({ refresh: 'refresh-1', client: 'partner-a' }),
    ]);
    expect(cached.writtenAt).toEqual(expect.any(Number));

    mockFindById.mockClear();
    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('does not cache expired sessions', async () => {
    sessionStore.sessionInfo = [
      session({ id: 'live', refresh: 'live-token' }),
      session({ id: 'dead', refresh: 'dead-token', exp: Date.now() - 1 }),
    ];
    await service.validateSession(USER_ID, 'live-token');

    const cached: SessionCacheEnvelope = redis.store.get(sessionCacheKey(USER_ID));
    expect(cached.sessions.map((s) => s.refresh)).toEqual(['live-token']);
  });
});

describe('validateSession — client scoping', () => {
  it('accepts a token on the application it was issued for', async () => {
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'refresh-1' })];

    await expect(
      service.validateSession(USER_ID, 'refresh-1', { clientKey: 'partner-a' })
    ).resolves.toBe(true);
  });

  it('refuses a token presented to a different application', async () => {
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'refresh-1' })];

    await expect(
      service.validateSession(USER_ID, 'refresh-1', { clientKey: 'partner-b' })
    ).resolves.toBe(false);
  });

  it('keeps each application on its own session when the user holds both', async () => {
    sessionStore.sessionInfo = [
      session({ id: 'a', client: 'partner-a', refresh: 'token-a' }),
      session({ id: 'b', client: 'partner-b', refresh: 'token-b' }),
    ];

    await expect(
      service.validateSession(USER_ID, 'token-a', { clientKey: 'partner-a' })
    ).resolves.toBe(true);
    await expect(
      service.validateSession(USER_ID, 'token-b', { clientKey: 'partner-b' })
    ).resolves.toBe(true);
    await expect(
      service.validateSession(USER_ID, 'token-a', { clientKey: 'partner-b' })
    ).resolves.toBe(false);
  });

  it('honours a system-issued session on any application', async () => {
    sessionStore.sessionInfo = [session({ client: 'system', refresh: 'cli-token' })];

    await expect(
      service.validateSession(USER_ID, 'cli-token', { clientKey: 'partner-b' })
    ).resolves.toBe(true);
  });

  it('does not narrow anything when the request has no resolved client', async () => {
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'refresh-1' })];

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
  });
});

describe('resolveSessionState', () => {
  it('reports a good token as valid', async () => {
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'refresh-1' })];

    await expect(
      service.resolveSessionState(USER_ID, 'refresh-1', { clientKey: 'partner-a' })
    ).resolves.toBe('valid');
  });

  it('separates a cross-application token from a revoked one', async () => {
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'refresh-1' })];

    await expect(
      service.resolveSessionState(USER_ID, 'refresh-1', { clientKey: 'partner-b' })
    ).resolves.toBe('client_mismatch');
    await expect(
      service.resolveSessionState(USER_ID, 'gone', { clientKey: 'partner-a' })
    ).resolves.toBe('revoked');
  });

  it('reports a client mismatch straight off the cache, without re-reading Mongo', async () => {
    cacheEnvelope({
      writtenAt: Date.now(),
      sessions: [{ id: 'a', refresh: 'refresh-1', client: 'partner-a', exp: Date.now() + HOUR }],
    });
    mockFindById.mockClear();

    await expect(
      service.resolveSessionState(USER_ID, 'refresh-1', { clientKey: 'partner-b' })
    ).resolves.toBe('client_mismatch');
    expect(mockFindById).not.toHaveBeenCalled();
  });
});

describe('validateSession — stale cache handling', () => {
  it('re-reads Mongo for a token issued after the cache was written', async () => {
    // The cache was written before this session existed - exactly what happens
    // when a login lands while a cached set is still warm.
    cacheEnvelope({
      writtenAt: Date.now() - 10 * 1000,
      sessions: [],
    });
    sessionStore.sessionInfo = [session({ refresh: 'brand-new' })];

    await expect(
      service.validateSession(USER_ID, 'brand-new', { issuedAt: Date.now() })
    ).resolves.toBe(true);
    expect(mockFindById).toHaveBeenCalled();
  });

  it('re-reads Mongo for a token issued in the same millisecond as the snapshot', async () => {
    // Millisecond stamps cannot order a login against a cache write that landed
    // in the same tick, so equality has to be treated as "might not be in there".
    // Getting this wrong rejects a token the user has only just been handed.
    const sameInstant = Date.now();
    cacheEnvelope({ writtenAt: sameInstant, sessions: [] });
    sessionStore.sessionInfo = [session({ refresh: 'brand-new', iat: sameInstant })];

    await expect(
      service.validateSession(USER_ID, 'brand-new', { issuedAt: sameInstant })
    ).resolves.toBe(true);
  });

  it('stamps the cache from before the read, not after the write', async () => {
    // A session added between the Mongo read and the Redis write is absent from
    // the snapshot; stamping at write time would wrongly vouch for its absence.
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];
    const before = Date.now();

    await service.validateSession(USER_ID, 'refresh-1');

    const cached: SessionCacheEnvelope = redis.store.get(sessionCacheKey(USER_ID));
    expect(cached.writtenAt).toBeGreaterThanOrEqual(before);
    expect(cached.writtenAt).toBeLessThanOrEqual((redis.setJSON.mock.calls[0][1] as any).writtenAt);
  });

  it('trusts the cache for a token older than it, so revocation stays fast', async () => {
    cacheEnvelope({
      writtenAt: Date.now(),
      sessions: [],
    });
    sessionStore.sessionInfo = [session({ refresh: 'revoked-token' })];
    mockFindById.mockClear();

    await expect(
      service.validateSession(USER_ID, 'revoked-token', { issuedAt: Date.now() - 10 * 1000 })
    ).resolves.toBe(false);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('trusts the cache when the caller gives no issue time', async () => {
    cacheEnvelope({
      writtenAt: Date.now(),
      sessions: [],
    });
    mockFindById.mockClear();

    await expect(service.validateSession(USER_ID, 'anything')).resolves.toBe(false);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('refreshes the cache after falling through', async () => {
    cacheEnvelope({
      writtenAt: Date.now() - 10 * 1000,
      sessions: [],
    });
    sessionStore.sessionInfo = [session({ refresh: 'brand-new' })];

    await service.validateSession(USER_ID, 'brand-new', { issuedAt: Date.now() });

    const cached: SessionCacheEnvelope = redis.store.get(sessionCacheKey(USER_ID));
    expect(cached.sessions.map((s) => s.refresh)).toEqual(['brand-new']);
  });
});

describe('validateSession — cache compatibility and failure', () => {
  it('reads a cache written by an older build as a bare array of refresh strings', async () => {
    redis.store.set(sessionCacheKey(USER_ID), ['legacy-token']);

    await expect(service.validateSession(USER_ID, 'legacy-token')).resolves.toBe(true);
  });

  it('reads a cache written by an older build as a bare array of records', async () => {
    redis.store.set(sessionCacheKey(USER_ID), [
      { refresh: 'legacy-token', client: 'partner-a', exp: Date.now() + HOUR },
    ]);

    await expect(
      service.validateSession(USER_ID, 'legacy-token', { clientKey: 'partner-a' })
    ).resolves.toBe(true);
  });

  it('treats a legacy cache as non-authoritative, so a new token still resolves', async () => {
    redis.store.set(sessionCacheKey(USER_ID), ['some-other-token']);
    sessionStore.sessionInfo = [session({ refresh: 'brand-new' })];

    await expect(
      service.validateSession(USER_ID, 'brand-new', { issuedAt: Date.now() })
    ).resolves.toBe(true);
  });

  it('falls back to Mongo when Redis reads throw', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];
    redis.getJSON.mockRejectedValue(new Error('redis down'));

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
  });

  it('works with no Redis configured at all', async () => {
    service = buildService(false);
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
  });

  it('still issues a verdict when a cache write fails', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];
    redis.setJSON.mockRejectedValue(new Error('redis full'));

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
  });
});

describe('invalidateSessionCache', () => {
  it('drops the cached set for the user', async () => {
    redis.store.set(sessionCacheKey(USER_ID), { writtenAt: Date.now(), sessions: [] });

    await service.invalidateSessionCache(USER_ID);

    expect(redis.del).toHaveBeenCalledWith(sessionCacheKey(USER_ID));
    expect(redis.store.has(sessionCacheKey(USER_ID))).toBe(false);
  });

  it('is a no-op without Redis', async () => {
    service = buildService(false);
    await expect(service.invalidateSessionCache(USER_ID)).resolves.toBeUndefined();
  });
});

describe('touchSession', () => {
  it('updates lastLogin atomically rather than saving the document', async () => {
    await service.touchSession(USER_ID);

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = (mockUpdateOne as jest.Mock).mock.calls[0];
    expect(update.$set.lastLogin).toBeInstanceOf(Date);
    expect(update.$set.sessionInfo).toBeUndefined();
  });

  it('updates the matching membership when a client is given', async () => {
    const clientId = '507f1f77bcf86cd799439099';
    await service.touchSession(USER_ID, clientId);

    const [filter, update] = (mockUpdateOne as jest.Mock).mock.calls[0];
    expect(filter['memberships.clientId']).toBeDefined();
    expect(update.$set['memberships.$.lastLogin']).toBeInstanceOf(Date);
  });

  it('swallows failures so the auth hot path is never blocked', async () => {
    mockUpdateOne.mockImplementation(() => ({
      exec: jest.fn().mockRejectedValue(new Error('write failed')),
    }));

    await expect(service.touchSession(USER_ID)).resolves.toBeUndefined();
  });
});

describe('listActiveTokens', () => {
  it('summarises the sessions on the user document', async () => {
    const exp = Date.now() + HOUR;
    const iat = Date.now();
    (require('@reactory/server-modules/reactory-core/models').User.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: USER_ID,
        email: 'user@example.com',
        sessionInfo: [session({ id: 'sess-1', client: 'partner-a', refresh: 'r1', exp, iat })],
      }),
    });

    const tokens = await service.listActiveTokens('user@example.com');

    expect(tokens).toEqual([
      {
        sessionId: 'sess-1',
        host: '10.0.0.1',
        client: 'partner-a',
        expiresAt: new Date(exp).toISOString(),
        issuedAt: new Date(iat).toISOString(),
        isValid: true,
      },
    ]);
  });
});
