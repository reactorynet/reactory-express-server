/**
 * Unit tests for the shared multi-tenant session primitives.
 *
 * These cover the rules in isolation — liveness, client scoping, eviction order,
 * reuse selection and the shape of the Mongo writes. The behaviour they describe
 * is exercised end to end in
 * `src/authentication/strategies/__tests__/multiTenantSessions.integration.spec.ts`.
 */

const mockUpdateOne = jest.fn();
const mockFindById = jest.fn();

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    updateOne: (...args: any[]) => mockUpdateOne(...args),
    findById: (...args: any[]) => mockFindById(...args),
  },
}));

import {
  appendSession,
  buildSessionEntry,
  clientScopeMatches,
  computeEvictions,
  DEFAULT_MAX_SESSIONS_PER_CLIENT,
  findReusableSession,
  findSessionBySlot,
  isSessionLive,
  isSessionReuseEnabled,
  matchSession,
  readSessions,
  readSignedPayload,
  resolveSessionState,
  SESSION_CACHE_TTL,
  SESSION_GEN_TTL,
  sessionCacheKey,
  sessionGenKey,
  SessionInfoEntry,
  sessionSlotKey,
  toCachedRecords,
  toEpochMs,
} from '../sessions';

const HOUR = 60 * 60 * 1000;

/** Build a session row. `iat`/`exp` default to "issued now, valid for an hour". */
const session = (overrides: {
  id?: string;
  client?: string;
  host?: string;
  refresh?: string;
  iat?: number | Date | string;
  exp?: number | Date | string | null;
  withPayloadJson?: boolean;
} = {}): SessionInfoEntry => {
  const {
    id = 'sess-1',
    client = 'partner-a',
    host = '10.0.0.1',
    refresh = 'refresh-1',
    iat = Date.now(),
    exp = Date.now() + HOUR,
    withPayloadJson = true,
  } = overrides;

  const payload = { refresh, iat, exp, sid: id, userId: 'user-1' };

  return {
    id,
    client,
    host,
    key: `${client}::${host}`,
    jwtPayload: payload as any,
    ...(withPayloadJson ? { jwtPayloadJson: JSON.stringify(payload) } : {}),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateOne.mockReturnValue({
    exec: jest.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }),
  });
  mockFindById.mockReturnValue({
    select: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue({ sessionInfo: [] }) }) }),
  });
  delete process.env.REACTORY_SESSION_REUSE;
  delete process.env.REACTORY_MAX_SESSIONS_PER_CLIENT;
  delete process.env.REACTORY_MAX_TOTAL_SESSIONS;
});

describe('cache keys', () => {
  it('namespaces the session cache by user id', () => {
    expect(sessionCacheKey('user-1')).toBe('reactory:security:sessions:user-1');
  });

  it('keeps the generation counter outside the session cache prefix', () => {
    // The startup purge globs the session cache prefix. If the counters lived
    // under it they would be swept too, and a restarted counter could collide
    // with a surviving envelope's generation.
    expect(sessionGenKey('user-1')).toBe('reactory:security:sessiongen:user-1');
    expect(sessionGenKey('user-1').startsWith(sessionCacheKey(''))).toBe(false);
  });

  it('expires the generation counter well after any envelope it governs', () => {
    // The invariant that makes generation comparison safe: no cached envelope can
    // outlive the counter it was written against.
    expect(SESSION_GEN_TTL).toBeGreaterThan(SESSION_CACHE_TTL * 10);
  });
});

describe('sessionSlotKey', () => {
  it('derives a stable slot from the application and host under reuse', () => {
    expect(sessionSlotKey('partner-a', '10.0.0.1')).toBe('partner-a::10.0.0.1');
    expect(sessionSlotKey('partner-a', '10.0.0.1')).toBe(sessionSlotKey('partner-a', '10.0.0.1'));
  });

  it('separates applications and hosts', () => {
    expect(sessionSlotKey('partner-a', '10.0.0.1')).not.toBe(sessionSlotKey('partner-b', '10.0.0.1'));
    expect(sessionSlotKey('partner-a', '10.0.0.1')).not.toBe(sessionSlotKey('partner-a', '10.0.0.2'));
  });

  it('gives every login its own slot when reuse is off, so logins stack', () => {
    process.env.REACTORY_SESSION_REUSE = 'false';
    expect(sessionSlotKey('partner-a', '10.0.0.1')).not.toBe(sessionSlotKey('partner-a', '10.0.0.1'));
  });
});

describe('findSessionBySlot', () => {
  it('finds the live session holding a slot', () => {
    const sessions = [session({ id: 's1', client: 'partner-a', host: '10.0.0.1' })];
    expect(findSessionBySlot(sessions, 'partner-a::10.0.0.1')?.id).toBe('s1');
  });

  it('ignores an expired holder', () => {
    const sessions = [session({ id: 's1', exp: Date.now() - 1 })];
    expect(findSessionBySlot(sessions, 'partner-a::10.0.0.1')).toBeUndefined();
  });

  it('ignores a holder that cannot be re-signed', () => {
    const sessions = [session({ id: 's1', withPayloadJson: false })];
    expect(findSessionBySlot(sessions, 'partner-a::10.0.0.1')).toBeUndefined();
  });
});

describe('toEpochMs', () => {
  const now = 1_700_000_000_000;

  it('passes numbers through', () => {
    expect(toEpochMs(now)).toBe(now);
  });

  it('accepts a Date, which is how Mongoose casts exp/iat', () => {
    expect(toEpochMs(new Date(now))).toBe(now);
  });

  it('accepts an ISO string, which is how JSON.stringify writes a Date to Redis', () => {
    expect(toEpochMs(new Date(now).toISOString())).toBe(now);
  });

  it('returns null for absent or unparseable values', () => {
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs(undefined)).toBeNull();
    expect(toEpochMs('not-a-date')).toBeNull();
    expect(toEpochMs(NaN)).toBeNull();
  });
});

describe('isSessionLive', () => {
  it('treats a future expiry as live', () => {
    expect(isSessionLive(session({ exp: Date.now() + HOUR }))).toBe(true);
  });

  it('treats a past expiry as dead', () => {
    expect(isSessionLive(session({ exp: Date.now() - 1 }))).toBe(false);
  });

  it('treats a missing expiry as live rather than guessing', () => {
    expect(isSessionLive(session({ exp: null }))).toBe(true);
  });

  it('reads exp off a cached record as well as a session row', () => {
    expect(isSessionLive({ refresh: 'r', exp: Date.now() + HOUR })).toBe(true);
    expect(isSessionLive({ refresh: 'r', exp: Date.now() - HOUR })).toBe(false);
  });
});

describe('clientScopeMatches', () => {
  it('matches a session to the client it was issued for', () => {
    expect(clientScopeMatches('partner-a', 'partner-a')).toBe(true);
  });

  it('refuses a session issued for another client', () => {
    expect(clientScopeMatches('partner-a', 'partner-b')).toBe(false);
  });

  it('honours unscoped sessions everywhere, so CLI and legacy rows keep working', () => {
    expect(clientScopeMatches('system', 'partner-b')).toBe(true);
    expect(clientScopeMatches('cli', 'partner-b')).toBe(true);
    expect(clientScopeMatches('not-set', 'partner-b')).toBe(true);
    expect(clientScopeMatches(undefined, 'partner-b')).toBe(true);
  });

  it('does not narrow anything when the request has no resolved client', () => {
    expect(clientScopeMatches('partner-a', undefined)).toBe(true);
    expect(clientScopeMatches('partner-a', 'not-set')).toBe(true);
  });
});

describe('matchSession / resolveSessionState', () => {
  it('finds the live session a refresh token names', () => {
    const sessions = [session({ id: 's1', refresh: 'r1' }), session({ id: 's2', refresh: 'r2' })];
    expect(matchSession(sessions, 'r2')?.id).toBe('s2');
    expect(resolveSessionState(sessions, 'r2')).toBe('valid');
  });

  it('reports an unknown refresh token as revoked', () => {
    expect(resolveSessionState([session({ refresh: 'r1' })], 'nope')).toBe('revoked');
  });

  it('reports an expired session as revoked, not valid', () => {
    const sessions = [session({ refresh: 'r1', exp: Date.now() - 1 })];
    expect(resolveSessionState(sessions, 'r1')).toBe('revoked');
  });

  it('distinguishes a cross-client token from a revoked one', () => {
    const sessions = [session({ client: 'partner-a', refresh: 'r1' })];
    expect(resolveSessionState(sessions, 'r1', { clientKey: 'partner-a' })).toBe('valid');
    expect(resolveSessionState(sessions, 'r1', { clientKey: 'partner-b' })).toBe('client_mismatch');
  });

  it('matches cached records as well as session rows', () => {
    const records = toCachedRecords([session({ id: 's1', client: 'partner-a', refresh: 'r1' })]);
    expect(resolveSessionState(records, 'r1', { clientKey: 'partner-a' })).toBe('valid');
    expect(resolveSessionState(records, 'r1', { clientKey: 'partner-b' })).toBe('client_mismatch');
  });

  it('treats an empty refresh token as no match rather than matching anything', () => {
    expect(resolveSessionState([session({ refresh: '' })], '')).toBe('revoked');
  });
});

describe('toCachedRecords', () => {
  it('projects the fields validation needs and normalises exp to epoch ms', () => {
    const exp = Date.now() + HOUR;
    const records = toCachedRecords([
      session({ id: 's1', client: 'partner-a', refresh: 'r1', exp: new Date(exp) }),
    ]);
    expect(records).toEqual([{ id: 's1', refresh: 'r1', client: 'partner-a', exp }]);
  });

  it('drops rows with no refresh token, which can never be matched', () => {
    const orphan: SessionInfoEntry = { id: 's1', client: 'partner-a', jwtPayload: {} as any };
    expect(toCachedRecords([orphan])).toEqual([]);
  });
});

describe('findReusableSession', () => {
  it('reuses the session held for the same client and host', () => {
    const sessions = [session({ id: 's1', client: 'partner-a', host: '10.0.0.1' })];
    expect(findReusableSession(sessions, 'partner-a', '10.0.0.1')?.id).toBe('s1');
  });

  it('does not reuse across applications', () => {
    const sessions = [session({ id: 's1', client: 'partner-a', host: '10.0.0.1' })];
    expect(findReusableSession(sessions, 'partner-b', '10.0.0.1')).toBeUndefined();
  });

  it('does not reuse across hosts, so a second device stacks its own session', () => {
    const sessions = [session({ id: 's1', client: 'partner-a', host: '10.0.0.1' })];
    expect(findReusableSession(sessions, 'partner-a', '10.0.0.2')).toBeUndefined();
  });

  it('ignores expired sessions', () => {
    const sessions = [session({ id: 's1', exp: Date.now() - 1 })];
    expect(findReusableSession(sessions, 'partner-a', '10.0.0.1')).toBeUndefined();
  });

  it('ignores sessions with no stored payload, which cannot be re-signed', () => {
    const sessions = [session({ id: 's1', withPayloadJson: false })];
    expect(findReusableSession(sessions, 'partner-a', '10.0.0.1')).toBeUndefined();
  });

  it('picks the newest when several candidates exist', () => {
    const sessions = [
      session({ id: 'old', refresh: 'r-old', iat: Date.now() - 5 * HOUR }),
      session({ id: 'new', refresh: 'r-new', iat: Date.now() - HOUR }),
      session({ id: 'mid', refresh: 'r-mid', iat: Date.now() - 3 * HOUR }),
    ];
    expect(findReusableSession(sessions, 'partner-a', '10.0.0.1')?.id).toBe('new');
  });
});

describe('isSessionReuseEnabled', () => {
  it('is on by default', () => {
    expect(isSessionReuseEnabled()).toBe(true);
  });

  it('is off only for an explicit "false"', () => {
    process.env.REACTORY_SESSION_REUSE = 'false';
    expect(isSessionReuseEnabled()).toBe(false);
    process.env.REACTORY_SESSION_REUSE = 'true';
    expect(isSessionReuseEnabled()).toBe(true);
  });
});

describe('computeEvictions', () => {
  it('keeps everything when nothing is expired and no cap is reached', () => {
    const sessions = [
      session({ id: 's1', client: 'partner-a' }),
      session({ id: 's2', client: 'partner-b' }),
    ];
    const { keep, evict } = computeEvictions(sessions, 'partner-a');
    expect(keep).toHaveLength(2);
    expect(evict).toHaveLength(0);
  });

  it('evicts expired sessions regardless of which client they belong to', () => {
    const sessions = [
      session({ id: 'dead-a', client: 'partner-a', exp: Date.now() - 1 }),
      session({ id: 'dead-b', client: 'partner-b', exp: Date.now() - 1 }),
      session({ id: 'live-b', client: 'partner-b' }),
    ];
    const { keep, evict } = computeEvictions(sessions, 'partner-a');
    expect(keep.map((s) => s.id)).toEqual(['live-b']);
    expect(evict.map((s) => s.id).sort()).toEqual(['dead-a', 'dead-b']);
  });

  it('never evicts a live session belonging to another application', () => {
    const sessions = Array.from({ length: 20 }, (_, i) =>
      session({ id: `b-${i}`, client: 'partner-b', refresh: `r-${i}`, iat: i })
    );
    const { keep, evict } = computeEvictions(sessions, 'partner-a', { maxPerClient: 2 });
    expect(evict).toHaveLength(0);
    expect(keep).toHaveLength(20);
  });

  it('applies the per-client cap oldest-first, leaving room for the new session', () => {
    const sessions = [
      session({ id: 'a-old', client: 'partner-a', refresh: 'r1', iat: 1000 }),
      session({ id: 'a-new', client: 'partner-a', refresh: 'r2', iat: 2000 }),
    ];
    const { keep, evict } = computeEvictions(sessions, 'partner-a', { maxPerClient: 2 });
    expect(evict.map((s) => s.id)).toEqual(['a-old']);
    expect(keep.map((s) => s.id)).toEqual(['a-new']);
  });

  it('applies the global cap oldest-first across every application', () => {
    const sessions = [
      session({ id: 'a', client: 'partner-a', refresh: 'r1', iat: 1000 }),
      session({ id: 'b', client: 'partner-b', refresh: 'r2', iat: 2000 }),
      session({ id: 'c', client: 'partner-c', refresh: 'r3', iat: 3000 }),
    ];
    const { keep, evict } = computeEvictions(sessions, 'partner-a', {
      maxPerClient: 10,
      maxTotal: 3,
    });
    expect(evict.map((s) => s.id)).toEqual(['a']);
    expect(keep.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('reads the caps from the environment when not passed explicitly', () => {
    process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = '1';
    const sessions = [session({ id: 'a-old', client: 'partner-a' })];
    expect(computeEvictions(sessions, 'partner-a').evict.map((s) => s.id)).toEqual(['a-old']);
  });

  it('falls back to the default cap when the environment value is nonsense', () => {
    process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = 'banana';
    const sessions = Array.from({ length: DEFAULT_MAX_SESSIONS_PER_CLIENT - 1 }, (_, i) =>
      session({ id: `a-${i}`, refresh: `r-${i}`, iat: i })
    );
    expect(computeEvictions(sessions, 'partner-a').evict).toHaveLength(0);
  });
});

describe('buildSessionEntry', () => {
  it('stamps the session id into the signed payload as sid', () => {
    const { session: entry, payload } = buildSessionEntry(
      { refresh: 'r1', userId: 'user-1' },
      '10.0.0.1',
      'partner-a',
      'sess-42'
    );
    expect(payload.sid).toBe('sess-42');
    expect(entry.id).toBe('sess-42');
    expect(entry.host).toBe('10.0.0.1');
    expect(entry.client).toBe('partner-a');
  });

  it('records the slot the session occupies', () => {
    const { session: entry } = buildSessionEntry({ refresh: 'r1' }, '10.0.0.1', 'partner-a', 'sess-42');
    expect(entry.key).toBe('partner-a::10.0.0.1');
  });

  it('honours an explicit slot, so a retry can opt out of contention', () => {
    const { session: entry } = buildSessionEntry(
      { refresh: 'r1' },
      '10.0.0.1',
      'partner-a',
      'sess-42',
      'bespoke-slot'
    );
    expect(entry.key).toBe('bespoke-slot');
  });

  it('stores the signed payload verbatim so the token can be reproduced', () => {
    const { session: entry, payload } = buildSessionEntry(
      { refresh: 'r1', userId: 'user-1', name: 'John Doe', exp: 123, iat: 1 },
      '10.0.0.1',
      'partner-a',
      'sess-42'
    );
    expect(JSON.parse(entry.jwtPayloadJson as string)).toEqual(payload);
    expect(readSignedPayload(entry)).toEqual(payload);
  });

  it('does not store a signature, only the payload', () => {
    const { session: entry } = buildSessionEntry({ refresh: 'r1' }, 'h', 'c', 'sess-1');
    expect(JSON.stringify(entry)).not.toContain('.');
  });
});

describe('readSignedPayload', () => {
  it('returns null when nothing was stored', () => {
    expect(readSignedPayload({ id: 's1' })).toBeNull();
  });

  it('returns null rather than throwing on corrupt JSON', () => {
    expect(readSignedPayload({ id: 's1', jwtPayloadJson: '{not json' })).toBeNull();
  });
});

describe('readSessions', () => {
  it('reads sessionInfo straight from Mongo rather than an in-memory document', async () => {
    const stored = [session({ id: 's1' })];
    const exec = jest.fn().mockResolvedValue({ sessionInfo: stored });
    mockFindById.mockReturnValue({ select: () => ({ lean: () => ({ exec }) }) });

    await expect(readSessions('user-1')).resolves.toEqual(stored);
    expect(mockFindById).toHaveBeenCalledWith('user-1');
  });

  it('returns an empty list when the user has no sessions', async () => {
    mockFindById.mockReturnValue({
      select: () => ({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }),
    });
    await expect(readSessions('user-1')).resolves.toEqual([]);
  });
});

describe('appendSession', () => {
  const applied = { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  const rejected = { acknowledged: true, matchedCount: 0, modifiedCount: 0 };

  it('appends with $push so a concurrent login cannot be overwritten', async () => {
    const entry = session({ id: 'new' });
    await expect(appendSession({ userId: 'user-1', session: entry })).resolves.toEqual({
      claimed: true,
    });

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = mockUpdateOne.mock.calls[0];
    expect(filter._id).toBe('user-1');
    expect(update.$push).toEqual({ sessionInfo: entry });
    expect(update.$set.lastLogin).toBeInstanceOf(Date);
    // The whole array is never rewritten - that is what loses concurrent logins.
    expect(update.$set.sessionInfo).toBeUndefined();
  });

  it('only applies when no live session already holds the slot', async () => {
    await appendSession({ userId: 'user-1', session: session({ id: 'new' }) });

    const [filter] = mockUpdateOne.mock.calls[0];
    const guard = filter.sessionInfo.$not.$elemMatch;
    expect(guard.key).toBe('partner-a::10.0.0.1');
    expect(guard['jwtPayload.exp'].$gt).toBeInstanceOf(Date);
    // A row that cannot be re-signed must not block a login it could never serve.
    expect(guard.jwtPayloadJson).toEqual({ $exists: true });
  });

  it('reports the slot as unclaimed when another request got there first', async () => {
    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(rejected) });

    await expect(
      appendSession({ userId: 'user-1', session: session({ id: 'new' }) })
    ).resolves.toEqual({ claimed: false });
  });

  it('does not prune when the slot was not claimed', async () => {
    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(rejected) });

    await appendSession({
      userId: 'user-1',
      session: session({ id: 'new' }),
      evict: [session({ id: 'dead-1' })],
    });

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
  });

  it('pushes before pulling, so a failed prune leaves a surplus not a gap', async () => {
    await appendSession({
      userId: 'user-1',
      session: session({ id: 'new' }),
      evict: [session({ id: 'dead-1' }), session({ id: 'dead-2' })],
    });

    expect(mockUpdateOne).toHaveBeenCalledTimes(2);
    const [, first] = mockUpdateOne.mock.calls[0];
    const [, second] = mockUpdateOne.mock.calls[1];
    expect(first.$push).toBeDefined();
    expect(second).toEqual({ $pull: { sessionInfo: { id: { $in: ['dead-1', 'dead-2'] } } } });
  });

  it('can skip the lastLogin touch', async () => {
    await appendSession({ userId: 'user-1', session: session(), touchLastLogin: false });
    const [, update] = mockUpdateOne.mock.calls[0];
    expect(update.$set).toBeUndefined();
  });

  it('reads nModified from older drivers that report it that way', async () => {
    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ n: 1, nModified: 1 }) });
    await expect(
      appendSession({ userId: 'user-1', session: session({ id: 'new' }) })
    ).resolves.toEqual({ claimed: true });

    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ n: 0, nModified: 0 }) });
    await expect(
      appendSession({ userId: 'user-1', session: session({ id: 'new' }) })
    ).resolves.toEqual({ claimed: false });
  });

  it('treats a result with no counters as applied rather than failing closed', async () => {
    mockUpdateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });
    await expect(
      appendSession({ userId: 'user-1', session: session({ id: 'new' }) })
    ).resolves.toEqual({ claimed: true });
  });

  it('propagates a write failure instead of reporting success', async () => {
    mockUpdateOne.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('mongo write failed')),
    });

    await expect(
      appendSession({ userId: 'user-1', session: session({ id: 'new' }) })
    ).rejects.toThrow('mongo write failed');
    expect(applied).toBeDefined();
  });

  it('repairs legacy rows that have no id, since $pull cannot address them', async () => {
    const legacy: SessionInfoEntry = {
      client: 'partner-a',
      host: '10.0.0.1',
      jwtPayload: { refresh: 'legacy-refresh', exp: Date.now() - 1 } as any,
    };
    const keeper = session({ id: 'keeper', refresh: 'keeper-refresh' });
    const exec = jest.fn().mockResolvedValue({ sessionInfo: [legacy, keeper] });
    mockFindById.mockReturnValue({ select: () => ({ lean: () => ({ exec }) }) });

    const entry = session({ id: 'new', refresh: 'new-refresh' });
    await expect(
      appendSession({ userId: 'user-1', session: entry, evict: [legacy] })
    ).resolves.toEqual({ claimed: true });

    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = mockUpdateOne.mock.calls[0];
    const written: SessionInfoEntry[] = update.$set.sessionInfo;
    // The unaddressable row is gone, the keeper survives, the new session is added
    // and every surviving row now carries an id.
    expect(written.map((s) => s.jwtPayload?.refresh)).toEqual(['keeper-refresh', 'new-refresh']);
    expect(written.every((s) => Boolean(s.id))).toBe(true);
  });
});
