/**
 * Shared session primitives for Reactory's multi-tenant session model.
 *
 * Reactory is a multitenant host: one `User` document backs concurrent logins
 * against several partner applications ("clients"), and against the same client
 * from several devices. Every rule about *which* session a bearer token maps to
 * lives here so that the three places that care — `Helpers` (login), the
 * `SecurityService` (validation/administration) and the JWT strategy (request
 * authentication) — can never drift apart.
 *
 * Two invariants this module exists to protect:
 *
 * 1. **Sessions stack.** Logging into app B must not disturb the session held
 *    against app A. That means no code path may ever rewrite the whole
 *    `sessionInfo` array from a value it read earlier — a concurrent login would
 *    be silently lost. `persistSession` uses `$pull` + `$push` so the server,
 *    not the caller, decides the final array.
 *
 * 2. **A session belongs to one client.** A token minted for app A does not
 *    authenticate against app B, even though the same user is a member of both.
 *
 * 3. **Nothing here compares wall clocks across processes.** Reactory runs
 *    several pods against one Redis and one Mongo, and their clocks disagree by
 *    however much NTP is drifting. Cache freshness is therefore tracked with a
 *    monotonic per-user counter (see `sessionGenKey`), never a timestamp: a few
 *    hundred milliseconds of skew must not be able to reject a token that was
 *    issued a moment ago on another pod.
 */
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { User } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Redis key prefix for cached active-session sets. */
export const SESSION_CACHE_PREFIX = 'reactory:security:sessions:';

/**
 * Redis TTL (seconds) for cached session data. Short enough that a lost
 * generation bump self-heals quickly, long enough that the hot read path stays
 * off Mongo.
 */
export const SESSION_CACHE_TTL = 300;

/**
 * Redis key prefix for the per-user session generation counter.
 *
 * Deliberately *not* nested under `SESSION_CACHE_PREFIX`: the startup purge
 * globs that prefix, and sweeping the counters along with the cache would be a
 * bug (see the invariant on `SESSION_GEN_TTL`).
 */
export const SESSION_GEN_PREFIX = 'reactory:security:sessiongen:';

/**
 * TTL (seconds) for the generation counter — 24 hours.
 *
 * **Invariant: this must stay comfortably larger than `SESSION_CACHE_TTL`.** A
 * cached envelope records the generation it was built from, and staleness is
 * detected by comparing that against the current counter. If the counter could
 * expire and restart at 1 while an envelope from an older era were still live,
 * the two could collide and a stale envelope would be trusted. Because a cached
 * envelope cannot outlive the counter, any envelope we ever read was written
 * during the current counter's lifetime.
 */
export const SESSION_GEN_TTL = 24 * 60 * 60;

/** Fallback client key used when a caller could not resolve a partner. */
export const UNSCOPED_CLIENT_KEY = 'not-set';

/**
 * Client keys that do not scope a session to a single application. Sessions
 * carrying one of these are honoured for any requesting client — they are
 * either legacy rows written before sessions were scoped, or tokens minted
 * out-of-band by the CLI/system where no partner was in play.
 */
export const UNSCOPED_CLIENT_KEYS: readonly string[] = [
  UNSCOPED_CLIENT_KEY,
  'system',
  'cli',
  'api',
  '',
];

/** Default cap on live sessions per user *per client*. */
export const DEFAULT_MAX_SESSIONS_PER_CLIENT = 10;

/** Default cap on live sessions per user across every client. */
export const DEFAULT_MAX_TOTAL_SESSIONS = 50;

// ─── Types ──────────────────────────────────────────────────────────────────

/** A row of `User.sessionInfo[]`. */
export interface SessionInfoEntry {
  id?: string;
  host?: string;
  client?: string;
  /**
   * Identity of the *slot* this session occupies, used to make concurrent
   * logins converge instead of racing. Under session reuse it is derived from
   * the client and host, so two simultaneous logins from the same browser
   * compete for one slot and exactly one wins. With reuse disabled it is unique
   * per session, so every login stacks.
   */
  key?: string;
  jwtPayload?: Record<string, unknown> & {
    exp?: number | string | Date | null;
    iat?: number | string | Date | null;
    refresh?: string;
    sid?: string;
  };
  /**
   * The exact JSON that was signed to produce this session's bearer token.
   *
   * `jwtPayload` above cannot be used for this: its Mongoose subschema casts
   * `exp`/`iat` to `Date` and drops claims it does not declare (`name`, `sid`),
   * so re-signing it would not reproduce the original token. Keeping the signed
   * JSON verbatim lets a repeat login hand back a byte-identical JWT.
   *
   * Only the payload is stored, never the signature — a leaked database still
   * yields nothing usable without `SECRET_SAUCE`.
   */
  jwtPayloadJson?: string;
}

/** The projection of a session that the Redis cache holds. */
export interface CachedSessionRecord {
  id?: string;
  refresh: string;
  client?: string;
  exp?: number | null;
}

/**
 * Cache envelope.
 *
 * `gen` is the value the per-user generation counter held *before* the sessions
 * were read from Mongo. A reader trusts the envelope only while `gen` still
 * matches the counter; any mutation in between bumps the counter and so retires
 * this envelope. That covers both directions of staleness with one mechanism:
 *
 *   - a session added after the snapshot cannot be judged absent by it, and
 *   - a revocation cannot be undone by an in-flight reader writing back a
 *     snapshot it took before the revocation landed.
 */
export interface SessionCacheEnvelope {
  gen: number;
  sessions: CachedSessionRecord[];
}

/**
 * Outcome of resolving a bearer token against a user's live sessions.
 *
 * `revoked` and `client_mismatch` are kept apart deliberately: both deny the
 * request, but they mean very different things when reading telemetry — one is a
 * session that ended, the other a token being presented to the wrong
 * application.
 */
export type SessionState = 'valid' | 'revoked' | 'client_mismatch';

export interface SessionMatchOptions {
  /** Requesting application. When set, a session scoped to another client will not match. */
  clientKey?: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const readIntEnv = (name: string, fallback: number): number => {
  const parsed = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getMaxSessionsPerClient = (): number =>
  readIntEnv('REACTORY_MAX_SESSIONS_PER_CLIENT', DEFAULT_MAX_SESSIONS_PER_CLIENT);

export const getMaxTotalSessions = (): number =>
  readIntEnv('REACTORY_MAX_TOTAL_SESSIONS', DEFAULT_MAX_TOTAL_SESSIONS);

/**
 * Whether a repeat login from the same application *and* the same host should
 * hand back the session (and therefore the token) it already holds, rather than
 * stacking another one. On by default; set `REACTORY_SESSION_REUSE=false` to
 * make every login mint a new session.
 */
export const isSessionReuseEnabled = (): boolean =>
  process.env.REACTORY_SESSION_REUSE !== 'false';

// ─── Pure helpers ───────────────────────────────────────────────────────────

export const sessionCacheKey = (userId: string): string => `${SESSION_CACHE_PREFIX}${userId}`;

/** Key of the monotonic counter that retires a user's cached session set. */
export const sessionGenKey = (userId: string): string => `${SESSION_GEN_PREFIX}${userId}`;

/**
 * The slot a login competes for.
 *
 * Under reuse, one live session per (application, host) — so a reload or a
 * second tab lands on the existing session while a second device gets its own.
 * With reuse disabled every login gets a unique slot and therefore stacks.
 */
export const sessionSlotKey = (clientKey: string, host: string): string =>
  isSessionReuseEnabled() ? `${clientKey}::${host}` : uuid();

/**
 * Normalise the many shapes `exp`/`iat` arrive in to epoch milliseconds.
 *
 * The value is a `number` when it comes straight from a freshly built payload,
 * a `Date` when Mongoose has cast it through the `sessionInfo` subschema, and
 * an ISO `string` once it has been through `JSON.stringify` into Redis.
 */
export const toEpochMs = (value: number | string | Date | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = moment(value as any);
  return parsed.isValid() ? parsed.valueOf() : null;
};

/** A session with no expiry recorded is treated as live — only an expiry in the past kills it. */
export const isSessionLive = (
  session: Pick<SessionInfoEntry, 'jwtPayload'> | CachedSessionRecord,
  now: number = Date.now()
): boolean => {
  const exp = 'jwtPayload' in session ? toEpochMs(session.jwtPayload?.exp) : toEpochMs(session.exp);
  if (exp === null) return true;
  return exp > now;
};

/**
 * Whether a session recorded against `sessionClient` may be used by a request
 * arriving for `requestClientKey`.
 *
 * Unscoped sessions (see `UNSCOPED_CLIENT_KEYS`) are honoured everywhere so
 * that CLI/system tokens and rows written before scoping existed keep working.
 * A request that could not resolve a partner is likewise not scoped, and does
 * not narrow anything.
 */
export const clientScopeMatches = (
  sessionClient: string | undefined | null,
  requestClientKey: string | undefined | null
): boolean => {
  if (!requestClientKey || UNSCOPED_CLIENT_KEYS.includes(requestClientKey)) return true;
  if (!sessionClient || UNSCOPED_CLIENT_KEYS.includes(sessionClient)) return true;
  return sessionClient === requestClientKey;
};

/** Project a `sessionInfo` row down to what the cache needs. */
export const toCachedRecord = (session: SessionInfoEntry): CachedSessionRecord | null => {
  const refresh = session.jwtPayload?.refresh;
  if (!refresh) return null;
  return {
    id: session.id,
    refresh: String(refresh),
    client: session.client,
    exp: toEpochMs(session.jwtPayload?.exp),
  };
};

export const toCachedRecords = (sessions: SessionInfoEntry[]): CachedSessionRecord[] =>
  sessions.map(toCachedRecord).filter((r): r is CachedSessionRecord => r !== null);

/**
 * Find the live session a refresh token names, honouring client scope.
 *
 * Returns `undefined` when no live session carries the token, and `null` when
 * one does but it belongs to another application — callers need to tell those
 * apart to report the right failure reason.
 */
export const matchSession = <T extends SessionInfoEntry | CachedSessionRecord>(
  sessions: T[],
  refreshToken: string,
  options: SessionMatchOptions = {},
  now: number = Date.now()
): T | null | undefined => {
  if (!refreshToken) return undefined;

  const named = sessions.filter((session) => {
    const refresh =
      'jwtPayload' in session
        ? (session as SessionInfoEntry).jwtPayload?.refresh
        : (session as CachedSessionRecord).refresh;
    return refresh === refreshToken;
  });

  const live = named.filter((session) => isSessionLive(session as any, now));
  if (live.length === 0) return undefined;

  const inScope = live.find((session) =>
    clientScopeMatches((session as any).client, options.clientKey)
  );

  return inScope ?? null;
};

/** `matchSession` reduced to the tri-state verdict callers report on. */
export const resolveSessionState = <T extends SessionInfoEntry | CachedSessionRecord>(
  sessions: T[],
  refreshToken: string,
  options: SessionMatchOptions = {},
  now: number = Date.now()
): SessionState => {
  const match = matchSession(sessions, refreshToken, options, now);
  if (match) return 'valid';
  return match === null ? 'client_mismatch' : 'revoked';
};

/**
 * The session a repeat login should hand back: the newest live session held
 * against the same application *from the same host*, that can actually be
 * re-signed (i.e. has its signed payload stored).
 *
 * Keying on host as well as client is what keeps "multiple sessions per app"
 * and "the same token for the same app" from contradicting each other — a
 * second device stacks a new session, a second tab reuses the existing one.
 */
export const findReusableSession = (
  sessions: SessionInfoEntry[],
  clientKey: string,
  host: string,
  now: number = Date.now()
): SessionInfoEntry | undefined => {
  const candidates = sessions.filter(
    (session) =>
      session.client === clientKey &&
      session.host === host &&
      Boolean(session.jwtPayloadJson) &&
      Boolean(session.jwtPayload?.refresh) &&
      isSessionLive(session, now)
  );

  if (candidates.length === 0) return undefined;

  return candidates.reduce((newest, candidate) =>
    (toEpochMs(candidate.jwtPayload?.iat) ?? 0) > (toEpochMs(newest.jwtPayload?.iat) ?? 0)
      ? candidate
      : newest
  );
};

/**
 * Decide which existing sessions must go before a new one is added.
 *
 * Expired sessions are always dropped. Beyond that the per-client cap is
 * applied first (so a busy application cannot starve the others), then the
 * global cap, evicting oldest-first by issue time in both cases.
 */
export const computeEvictions = (
  sessions: SessionInfoEntry[],
  clientKey: string,
  options: { maxPerClient?: number; maxTotal?: number; now?: number } = {}
): { keep: SessionInfoEntry[]; evict: SessionInfoEntry[] } => {
  const now = options.now ?? Date.now();
  const maxPerClient = options.maxPerClient ?? getMaxSessionsPerClient();
  const maxTotal = options.maxTotal ?? getMaxTotalSessions();

  const evict: SessionInfoEntry[] = [];
  let keep: SessionInfoEntry[] = [];

  sessions.forEach((session) => {
    if (isSessionLive(session, now)) keep.push(session);
    else evict.push(session);
  });

  const oldestFirst = (a: SessionInfoEntry, b: SessionInfoEntry) =>
    (toEpochMs(a.jwtPayload?.iat) ?? 0) - (toEpochMs(b.jwtPayload?.iat) ?? 0);

  // Per-client cap: leave room for the session about to be added.
  const sameClient = keep.filter((s) => s.client === clientKey).sort(oldestFirst);
  const clientOverflow = sameClient.length - maxPerClient + 1;
  if (clientOverflow > 0) {
    const dropped = sameClient.slice(0, clientOverflow);
    evict.push(...dropped);
    keep = keep.filter((s) => !dropped.includes(s));
  }

  // Global cap, again leaving room for one.
  const totalOverflow = keep.length - maxTotal + 1;
  if (totalOverflow > 0) {
    const dropped = [...keep].sort(oldestFirst).slice(0, totalOverflow);
    evict.push(...dropped);
    keep = keep.filter((s) => !dropped.includes(s));
  }

  return { keep, evict };
};

// ─── Persistence ────────────────────────────────────────────────────────────

/**
 * Read the current `sessionInfo` for a user straight from Mongo.
 *
 * Deliberately not taken from an in-memory document: a login handler may have
 * been holding that document across several awaits, by which time another
 * request could have added a session to it.
 */
export const readSessions = async (userId: string): Promise<SessionInfoEntry[]> => {
  const fresh: any = await (User as any)
    .findById(userId)
    .select('sessionInfo')
    .lean()
    .exec();
  return Array.isArray(fresh?.sessionInfo) ? (fresh.sessionInfo as SessionInfoEntry[]) : [];
};

export interface AppendSessionArgs {
  userId: string;
  session: SessionInfoEntry;
  /** Sessions to remove once the new one is safely in place (expired or evicted). */
  evict?: SessionInfoEntry[];
  /** Set `lastLogin` alongside the session write. */
  touchLastLogin?: boolean;
}

export interface AppendSessionResult {
  /** `false` when another request won the slot; the caller should reuse theirs. */
  claimed: boolean;
}

/**
 * Add a session to a user without ever rewriting the array wholesale, and
 * without two concurrent logins for the same slot both succeeding.
 *
 * Three things make this safe under concurrency:
 *
 * 1. **`$push`, never `$set`.** The server decides the final array, so two
 *    logins racing against the same user both land instead of one overwriting
 *    the other.
 * 2. **A conditional filter on the push.** The update only applies when no
 *    *live* session already holds this slot, so simultaneous logins from one
 *    browser produce one session, not two. Expired rows and rows predating slot
 *    keys are ignored by the filter, so they never block a login.
 * 3. **Push before pull.** Eviction happens only after the new session is in
 *    place. If the pull fails we are left with a surplus session that the next
 *    login prunes — the harmless direction. Doing it the other way round can
 *    log other devices out and then fail to issue anything.
 *
 * Legacy rows with no `id` cannot be addressed by `$pull`. Rather than guess,
 * such a user falls back to a single `$set` of the computed array — a one-time
 * repair that stamps ids on every row, after which the atomic path applies. That
 * repair does not contend for the slot, so two logins arriving together during it
 * can still produce two sessions; it happens once per affected user and the next
 * login is on the atomic path.
 */
export const appendSession = async ({
  userId,
  session,
  evict = [],
  touchLastLogin = true,
}: AppendSessionArgs): Promise<AppendSessionResult> => {
  const evictIds = evict.map((s) => s.id).filter((id): id is string => Boolean(id));
  const hasUnaddressableRows = evict.length !== evictIds.length;

  if (hasUnaddressableRows) {
    await repairAndSet(userId, session, evict, touchLastLogin);
    return { claimed: true };
  }

  // Claim the slot. `$not: {$elemMatch: ...}` means "no array element matches",
  // i.e. nobody live is holding it. The `jwtPayloadJson` requirement keeps rows
  // that cannot be re-signed from blocking a login they could never serve.
  const claim = await (User as any)
    .updateOne(
      {
        _id: userId,
        sessionInfo: {
          $not: {
            $elemMatch: {
              key: session.key,
              jwtPayloadJson: { $exists: true },
              'jwtPayload.exp': { $gt: new Date() },
            },
          },
        },
      },
      {
        $push: { sessionInfo: session },
        ...(touchLastLogin ? { $set: { lastLogin: new Date() } } : {}),
      }
    )
    .exec();

  if (!wasApplied(claim)) return { claimed: false };

  // Only now that the new session exists is it safe to prune.
  if (evictIds.length > 0) {
    await (User as any)
      .updateOne({ _id: userId }, { $pull: { sessionInfo: { id: { $in: evictIds } } } })
      .exec();
  }

  return { claimed: true };
};

/**
 * Whether an update actually changed the document.
 *
 * Mongo drivers have reported this under different names over the years, and a
 * mocked model may report none of them; treating "no counters at all" as applied
 * keeps this from failing closed against a stub that did the write.
 */
const wasApplied = (result: any): boolean => {
  if (!result || typeof result !== 'object') return true;
  const modified = result.modifiedCount ?? result.nModified;
  const matched = result.matchedCount ?? result.n;
  if (typeof modified === 'number') return modified > 0;
  if (typeof matched === 'number') return matched > 0;
  return true;
};

/**
 * One-time repair for users whose sessions predate session ids: rewrite the
 * array with ids stamped on every surviving row. Rows are identified by refresh
 * token, which is unique per session even when `id` is absent.
 */
const repairAndSet = async (
  userId: string,
  session: SessionInfoEntry,
  evict: SessionInfoEntry[],
  touchLastLogin: boolean
): Promise<void> => {
  const rowKey = (s: SessionInfoEntry) =>
    JSON.stringify([s.id ?? null, s.jwtPayload?.refresh ?? null, s.client ?? null, s.host ?? null]);
  const kept = await readSessions(userId);
  const evictKeys = new Set(evict.map(rowKey));
  const repaired = kept
    .filter((s) => !evictKeys.has(rowKey(s)))
    .map((s) => ({ ...s, id: s.id ?? uuid() }));
  repaired.push(session);

  await (User as any)
    .updateOne(
      { _id: userId },
      {
        $set: {
          sessionInfo: repaired,
          ...(touchLastLogin ? { lastLogin: new Date() } : {}),
        },
      }
    )
    .exec();
};

/**
 * The live session currently holding a slot, if any — used to recover after
 * losing the race for it.
 */
export const findSessionBySlot = (
  sessions: SessionInfoEntry[],
  slotKey: string,
  now: number = Date.now()
): SessionInfoEntry | undefined =>
  sessions.find(
    (s) => s.key === slotKey && Boolean(s.jwtPayloadJson) && isSessionLive(s, now)
  );

/**
 * Build the `sessionInfo` row for a freshly minted token.
 *
 * `sid` is written into the signed payload as well as the row. It is what lets
 * the JWT strategy tell "this token was session-backed and its session is gone"
 * (reject) from "this token was never session-backed" (an out-of-band link or
 * CLI token — accept on signature and expiry alone).
 */
export const buildSessionEntry = (
  payload: Record<string, unknown>,
  host: string,
  clientKey: string,
  sessionId: string = uuid(),
  slotKey: string = sessionSlotKey(clientKey, host)
): { session: SessionInfoEntry; payload: Record<string, unknown> } => {
  const signedPayload = { ...payload, sid: sessionId };

  return {
    payload: signedPayload,
    session: {
      id: sessionId,
      host,
      client: clientKey,
      key: slotKey,
      jwtPayload: signedPayload,
      jwtPayloadJson: JSON.stringify(signedPayload),
    },
  };
};

/**
 * Recover the exact payload that was signed for a stored session, so it can be
 * re-signed into the same token. Returns `null` when the stored JSON is missing
 * or unreadable, which simply means the caller should mint a new session.
 */
export const readSignedPayload = (session: SessionInfoEntry): Record<string, unknown> | null => {
  if (!session.jwtPayloadJson) return null;
  try {
    const parsed = JSON.parse(session.jwtPayloadJson);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err: any) {
    logger.warn(`[sessions] Stored session payload for ${session.id} is not valid JSON`);
    return null;
  }
};
