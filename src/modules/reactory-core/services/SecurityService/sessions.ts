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
 */
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { User } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Redis key prefix for cached active-session sets. */
export const SESSION_CACHE_PREFIX = 'reactory:security:sessions:';

/**
 * Redis TTL (seconds) for cached session data. Short enough that a missed
 * invalidation self-heals quickly, long enough that the hot read path stays off
 * Mongo. Note that a stale cache cannot reject a freshly issued token: see the
 * `writtenAt` handling in `SessionCacheEnvelope`.
 */
export const SESSION_CACHE_TTL = 300;

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
 * Cache envelope. The `writtenAt` stamp is what makes a stale cache safe: a
 * token issued *after* the cache was written cannot be judged by it, so
 * validation falls through to Mongo instead of rejecting a valid new session.
 */
export interface SessionCacheEnvelope {
  writtenAt: number;
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

export interface PersistSessionArgs {
  userId: string;
  session: SessionInfoEntry;
  /** Sessions to remove in the same operation (expired or evicted). */
  evict?: SessionInfoEntry[];
  /** Set `lastLogin` alongside the session write. */
  touchLastLogin?: boolean;
}

/**
 * Add a session to a user, removing any evicted ones, without ever rewriting
 * the array wholesale.
 *
 * `$pull` and `$push` cannot be combined on one field in a single update, so
 * this is two operations — but each is an atomic, server-side edit, which is
 * the point: two logins racing against the same user both end up in
 * `sessionInfo` instead of one overwriting the other.
 *
 * Legacy rows with no `id` cannot be addressed by `$pull`. Rather than guess,
 * such a user falls back to a single `$set` of the computed array — a one-time
 * repair that stamps ids on every row, after which the atomic path applies.
 */
export const persistSession = async ({
  userId,
  session,
  evict = [],
  touchLastLogin = true,
}: PersistSessionArgs): Promise<void> => {
  const evictIds = evict.map((s) => s.id).filter((id): id is string => Boolean(id));
  const hasUnaddressableRows = evict.length !== evictIds.length;

  if (hasUnaddressableRows) {
    // Identify rows by their refresh token, which is unique per session even
    // when `id` is absent.
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
    return;
  }

  if (evictIds.length > 0) {
    await (User as any)
      .updateOne({ _id: userId }, { $pull: { sessionInfo: { id: { $in: evictIds } } } })
      .exec();
  }

  await (User as any)
    .updateOne(
      { _id: userId },
      {
        $push: { sessionInfo: session },
        ...(touchLastLogin ? { $set: { lastLogin: new Date() } } : {}),
      }
    )
    .exec();
};

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
  sessionId: string = uuid()
): { session: SessionInfoEntry; payload: Record<string, unknown> } => {
  const signedPayload = { ...payload, sid: sessionId };

  return {
    payload: signedPayload,
    session: {
      id: sessionId,
      host,
      client: clientKey,
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
