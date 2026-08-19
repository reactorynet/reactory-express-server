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
import { sessionCacheKey, SessionCacheEnvelope, sessionGenKey } from '../sessions';

const HOUR = 60 * 60 * 1000;
const USER_ID = '507f1f77bcf86cd799439011';

/** An in-memory stand-in for RedisService that records what was written. */
const createFakeRedis = () => {
  const store = new Map<string, any>();
  return {
    store,
    get: jest.fn(async (key: string) => (store.has(key) ? String(store.get(key)) : null)),
    getJSON: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    setJSON: jest.fn(async (key: string, value: any) => {
      store.set(key, JSON.parse(JSON.stringify(value)));
      return 'OK' as const;
    }),
    del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    incr: jest.fn(async (key: string) => {
      const next = (parseInt(store.get(key) ?? '0', 10) || 0) + 1;
      store.set(key, String(next));
      return next;
    }),
    expire: jest.fn(async () => true),
    setIfAbsent: jest.fn(async (key: string, value: string) => {
      if (store.has(key)) return false;
      store.set(key, value);
      return true;
    }),
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

/**
 * Seed the Redis cache with an envelope, as SecurityService would have written
 * it, and align the generation counter so the envelope reads as current.
 */
const cacheEnvelope = (sessions: SessionCacheEnvelope['sessions'], gen = 0) => {
  redis.store.set(sessionCacheKey(USER_ID), { gen, sessions });
  redis.store.set(sessionGenKey(USER_ID), String(gen));
};

/** Seed an envelope that a later mutation has already retired. */
const staleCacheEnvelope = (sessions: SessionCacheEnvelope['sessions']) => {
  redis.store.set(sessionCacheKey(USER_ID), { gen: 3, sessions });
  redis.store.set(sessionGenKey(USER_ID), '4');
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
    expect(cached.gen).toEqual(expect.any(Number));

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
    cacheEnvelope([{ id: 'a', refresh: 'refresh-1', client: 'partner-a', exp: Date.now() + HOUR }], 2);
    mockFindById.mockClear();

    await expect(
      service.resolveSessionState(USER_ID, 'refresh-1', { clientKey: 'partner-b' })
    ).resolves.toBe('client_mismatch');
    expect(mockFindById).not.toHaveBeenCalled();
  });
});

describe('validateSession — cache currency by generation', () => {
  it('trusts a cached answer while its generation is current', async () => {
    cacheEnvelope([{ id: 'a', refresh: 'refresh-1', client: 'partner-a', exp: Date.now() + HOUR }], 7);
    mockFindById.mockClear();

    await expect(
      service.validateSession(USER_ID, 'refresh-1', { clientKey: 'partner-a' })
    ).resolves.toBe(true);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('trusts a current cache to say no, so revocation stays off Mongo', async () => {
    cacheEnvelope([], 7);
    sessionStore.sessionInfo = [session({ refresh: 'revoked-token' })];
    mockFindById.mockClear();

    await expect(service.validateSession(USER_ID, 'revoked-token')).resolves.toBe(false);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('discards a cached answer whose generation has moved on', async () => {
    staleCacheEnvelope([]);
    sessionStore.sessionInfo = [session({ refresh: 'brand-new' })];

    await expect(service.validateSession(USER_ID, 'brand-new')).resolves.toBe(true);
    expect(mockFindById).toHaveBeenCalled();
  });

  it('honours a token issued immediately after the cache was written', async () => {
    // A login bumps the generation, so the envelope written a moment earlier is
    // retired regardless of how the two clocks involved compare. This is the case
    // that a wall-clock stamp got wrong whenever pods drifted apart.
    cacheEnvelope([], 4);
    await service.invalidateSessionCache(USER_ID); // what a login does
    sessionStore.sessionInfo = [session({ refresh: 'brand-new' })];

    await expect(service.validateSession(USER_ID, 'brand-new')).resolves.toBe(true);
  });

  it('does not consult a clock to decide whether the cache is current', async () => {
    // Deliberately hostile: the cached entry is "newer" than the session by every
    // timestamp involved, and must still be discarded on generation alone.
    const future = Date.now() + 10 * HOUR;
    redis.store.set(sessionCacheKey(USER_ID), { gen: 1, sessions: [], writtenAt: future });
    redis.store.set(sessionGenKey(USER_ID), '2');
    sessionStore.sessionInfo = [session({ refresh: 'brand-new', iat: Date.now() - HOUR })];

    await expect(service.validateSession(USER_ID, 'brand-new')).resolves.toBe(true);
  });

  it('writes the cache against the generation read before the sessions', async () => {
    redis.store.set(sessionGenKey(USER_ID), '9');
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];

    await service.validateSession(USER_ID, 'refresh-1');

    const cached: SessionCacheEnvelope = redis.store.get(sessionCacheKey(USER_ID));
    expect(cached.gen).toBe(9);
    expect(cached.sessions.map((r) => r.refresh)).toEqual(['refresh-1']);
  });
});

describe('validateSession — revocation cannot be undone by an in-flight reader', () => {
  it('ignores a snapshot written back after the revocation landed', async () => {
    // The interleaving that used to resurrect a revoked session:
    //   reader loads Mongo -> revocation clears sessions and retires the cache
    //   -> reader writes its pre-revocation snapshot.
    sessionStore.sessionInfo = [session({ refresh: 'r1', client: 'partner-a' })];

    // 1. A reader captures the generation and the sessions.
    const genAtRead = await (service as any).readGeneration(USER_ID);
    const snapshot = [
      { id: 'sess-1', refresh: 'r1', client: 'partner-a', exp: Date.now() + HOUR },
    ];

    // 2. Revocation lands.
    sessionStore.sessionInfo = [];
    await service.invalidateSessionCache(USER_ID);

    // 3. The in-flight reader writes its now-obsolete snapshot.
    await (service as any).setCachedSessions(USER_ID, snapshot, genAtRead);

    // The revoked token must not be honoured off that entry.
    await expect(
      service.resolveSessionState(USER_ID, 'r1', { clientKey: 'partner-a' })
    ).resolves.toBe('revoked');
  });

  it('leaves the resurrected entry unusable rather than merely short-lived', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'r1' })];
    const genAtRead = await (service as any).readGeneration(USER_ID);
    sessionStore.sessionInfo = [];
    await service.invalidateSessionCache(USER_ID);
    await (service as any).setCachedSessions(
      USER_ID,
      [{ id: 'sess-1', refresh: 'r1', client: 'partner-a', exp: Date.now() + HOUR }],
      genAtRead
    );

    // Repeated attempts stay refused; there is no window that closes only on TTL.
    await expect(service.validateSession(USER_ID, 'r1')).resolves.toBe(false);
    await expect(service.validateSession(USER_ID, 'r1')).resolves.toBe(false);
  });
});

describe('validateSession — cache compatibility and failure', () => {
  it('ignores a cache written by an older build as a bare array', async () => {
    redis.store.set(sessionCacheKey(USER_ID), ['legacy-token']);
    sessionStore.sessionInfo = [];

    // Crucially it is not honoured: a legacy entry carried no client, so trusting
    // it would let a token through on an application it was not issued for.
    await expect(
      service.validateSession(USER_ID, 'legacy-token', { clientKey: 'partner-b' })
    ).resolves.toBe(false);
  });

  it('does not let a legacy entry bypass client scoping', async () => {
    redis.store.set(sessionCacheKey(USER_ID), ['token-a']);
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'token-a' })];

    await expect(
      service.validateSession(USER_ID, 'token-a', { clientKey: 'partner-b' })
    ).resolves.toBe(false);
    await expect(
      service.validateSession(USER_ID, 'token-a', { clientKey: 'partner-a' })
    ).resolves.toBe(true);
  });

  it('rebuilds a legacy entry in the current shape', async () => {
    redis.store.set(sessionCacheKey(USER_ID), ['token-a']);
    sessionStore.sessionInfo = [session({ client: 'partner-a', refresh: 'token-a' })];

    await service.validateSession(USER_ID, 'token-a', { clientKey: 'partner-a' });

    const cached: any = redis.store.get(sessionCacheKey(USER_ID));
    expect(Array.isArray(cached)).toBe(false);
    expect(cached.gen).toEqual(expect.any(Number));
  });

  it('falls back to Mongo when the generation cannot be read', async () => {
    sessionStore.sessionInfo = [session({ refresh: 'refresh-1' })];
    cacheEnvelope([], 1);
    redis.get.mockRejectedValue(new Error('redis down'));

    await expect(service.validateSession(USER_ID, 'refresh-1')).resolves.toBe(true);
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
  it('retires the cached set by bumping the generation, not by deleting it', async () => {
    // A delete races: a reader that started earlier can write its snapshot back
    // afterwards and undo it. A bump retires envelopes that have not been written
    // yet, which a delete cannot.
    cacheEnvelope([{ id: 'a', refresh: 'r1', exp: Date.now() + HOUR }], 1);

    await service.invalidateSessionCache(USER_ID);

    expect(redis.incr).toHaveBeenCalledWith(sessionGenKey(USER_ID));
    expect(redis.store.get(sessionGenKey(USER_ID))).toBe('2');
  });

  it('keeps the counter alive well beyond the entries it governs', async () => {
    await service.invalidateSessionCache(USER_ID);
    expect(redis.expire).toHaveBeenCalledWith(sessionGenKey(USER_ID), 24 * 60 * 60);
  });

  it('makes the existing entry unusable', async () => {
    cacheEnvelope([{ id: 'a', refresh: 'r1', client: 'partner-a', exp: Date.now() + HOUR }], 1);
    sessionStore.sessionInfo = [];

    await service.invalidateSessionCache(USER_ID);

    await expect(service.validateSession(USER_ID, 'r1')).resolves.toBe(false);
  });

  it('is a no-op without Redis', async () => {
    service = buildService(false);
    await expect(service.invalidateSessionCache(USER_ID)).resolves.toBeUndefined();
  });
});

describe('touchSession', () => {
  it('is throttled, so a stream of requests writes once', async () => {
    // Unthrottled this is one write per authenticated request per pod, all
    // converging on the same document for the shared anonymous account.
    await service.touchSession(USER_ID, undefined);
    await service.touchSession(USER_ID, undefined);
    await service.touchSession(USER_ID, undefined);

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
  });

  it('throttles per user and application, not globally', async () => {
    const clientA = '507f1f77bcf86cd7994390a1';
    const clientB = '507f1f77bcf86cd7994390b2';

    await service.touchSession(USER_ID, clientA);
    await service.touchSession(USER_ID, clientB);

    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
  });

  it('claims the throttle marker atomically so pods cannot both write', async () => {
    await service.touchSession(USER_ID);
    expect(redis.setIfAbsent).toHaveBeenCalledWith(
      `reactory:security:touch:${USER_ID}:none`,
      '1',
      60
    );
  });

  it('writes every time when Redis is unavailable, rather than dropping the timestamp', async () => {
    service = buildService(false);

    await service.touchSession(USER_ID);
    await service.touchSession(USER_ID);

    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
  });

  it('writes when the throttle marker cannot be claimed due to a Redis error', async () => {
    redis.setIfAbsent.mockRejectedValue(new Error('redis down'));

    await service.touchSession(USER_ID);

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
  });

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

describe('createToken', () => {
  const resolveTo = (user: any) =>
    (require('@reactory/server-modules/reactory-core/models').User.findOne as jest.Mock).mockReturnValue(
      { exec: jest.fn().mockResolvedValue(user) }
    );

  it('records a session on a slot of its own, so it never loses a race', async () => {
    // createToken is an explicit request for a new token. Deriving its slot from
    // client and host would let an existing CLI session block the write and leave
    // the caller holding a token no session backs.
    resolveTo({ _id: USER_ID, email: 'u@e.com', firstName: 'A', lastName: 'B', sessionInfo: [] });

    const result = await service.createToken('u@e.com', { clientKey: 'system', host: 'cli' });

    const [filter, update] = (mockUpdateOne as jest.Mock).mock.calls[0];
    const pushed = update.$push.sessionInfo;
    expect(pushed.key).toBe(pushed.id);
    expect(filter.sessionInfo.$not.$elemMatch.key).toBe(pushed.id);
    expect(result.token).toEqual(expect.any(String));
  });

  it('signs the payload that was actually stored, sid included', async () => {
    resolveTo({ _id: USER_ID, email: 'u@e.com', firstName: 'A', lastName: 'B', sessionInfo: [] });

    const result = await service.createToken('u@e.com');

    const [, update] = (mockUpdateOne as jest.Mock).mock.calls[0];
    const pushed = update.$push.sessionInfo;
    expect((result.payload as any).sid).toBe(pushed.id);
    expect(JSON.parse(pushed.jwtPayloadJson).sid).toBe(pushed.id);
  });

  it('refuses to return a token when the session could not be recorded', async () => {
    resolveTo({ _id: USER_ID, email: 'u@e.com', firstName: 'A', lastName: 'B', sessionInfo: [] });
    mockUpdateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }),
    });

    await expect(service.createToken('u@e.com')).rejects.toThrow(/cannot authenticate/);
  });

  it('retires the cached session set so the new token validates immediately', async () => {
    resolveTo({ _id: USER_ID, email: 'u@e.com', firstName: 'A', lastName: 'B', sessionInfo: [] });

    await service.createToken('u@e.com');

    expect(redis.incr).toHaveBeenCalledWith(sessionGenKey(USER_ID));
  });
});
