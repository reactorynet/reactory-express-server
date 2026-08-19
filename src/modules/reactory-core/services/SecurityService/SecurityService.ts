import Reactory from '@reactorynet/reactory-core';
import jwt from 'jwt-simple';
import moment, { DurationInputArg1, DurationInputArg2 } from 'moment';
import { v4 as uuid } from 'uuid';
import { isNil } from 'lodash';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';
import { service } from '@reactory/server-core/application/decorators';
import { User, PostgresDataSource } from '@reactory/server-modules/reactory-core/models';
import UserSession from '@reactory/server-modules/reactory-core/models/UserSession';
import logger from '@reactory/server-core/logging';
import { RedisService } from '../RedisService';
import {
  ISecurityService,
  CreateTokenOptions,
  CreateTokenResult,
  ExpireTokensCriteria,
  ExpireTokensResult,
  ActiveTokenSummary,
  SessionHistoryEntry,
  TokenLifetime,
  ValidateSessionOptions,
} from './types';
import {
  appendSession,
  buildSessionEntry,
  CachedSessionRecord,
  computeEvictions,
  isSessionLive,
  readSessions,
  resolveSessionState as sessionStateFor,
  SESSION_CACHE_TTL,
  SESSION_GEN_TTL,
  sessionCacheKey,
  SessionCacheEnvelope,
  sessionGenKey,
  SessionInfoEntry,
  SessionState,
  toCachedRecords,
} from './sessions';

/**
 * How long a `lastLogin` touch is suppressed for, in seconds.
 *
 * `touchSession` is fire-and-forget on every authenticated request. Left
 * unthrottled that is one Mongo write per request per pod, all converging on the
 * same document for shared accounts — the anonymous user is one document that
 * every visitor of an application authenticates as, so this is write contention
 * on a single hot document rather than a spread of small updates.
 */
const TOUCH_THROTTLE_SECONDS = 60;

/** Redis key prefix for the `lastLogin` touch throttle markers. */
const TOUCH_MARKER_PREFIX = 'reactory:security:touch:';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Duration presets for token lifetimes */
const LIFETIME_PRESETS: Record<
  TokenLifetime,
  { amount: DurationInputArg1; unit: DurationInputArg2 }
> = {
  short: { amount: 15, unit: 'minutes' },
  standard: { amount: 24, unit: 'hours' },
  long: { amount: 30, unit: 'days' },
};

// ─── Service ────────────────────────────────────────────────────────────────

@service({
  id: 'core.SecurityService@1.0.0',
  nameSpace: 'core',
  name: 'SecurityService',
  version: '1.0.0',
  description: 'Manages JWT tokens for user accounts: create, list, expire, and audit tokens',
  serviceType: 'security',
  lifeCycle: 'instance',
  dependencies: [
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
  features: [
    {
      feature: 'createToken',
      featureType: 'function',
      description: 'Create a JWT token for a user',
      action: ['createToken', 'create-token'],
      stem: 'create',
    },
    {
      feature: 'expireTokens',
      featureType: 'function',
      description: 'Expire tokens for one or more users',
      action: ['expireTokens', 'expire-tokens'],
      stem: 'expire',
    },
    {
      feature: 'listActiveTokens',
      featureType: 'function',
      description: 'List active session tokens for a user',
      action: ['listActiveTokens', 'list-tokens'],
      stem: 'list',
    },
    {
      feature: 'getSessionHistory',
      featureType: 'function',
      description: 'Get durable session history from PostgreSQL',
      action: ['getSessionHistory', 'session-history'],
      stem: 'history',
    },
  ],
})
class SecurityService implements ISecurityService {
  name: string = 'SecurityService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  private context: Reactory.Server.IReactoryContext;
  private props: Reactory.Service.IReactoryServiceProps;
  private redis: RedisService | null;
  private sessionRepo: Repository<UserSession>;

  constructor(
    props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.props = props;
    this.context = context;
    this.redis = (props.dependencies as any)?.redisService ?? null;

    // TypeORM repository for the durable session table
    this.sessionRepo = PostgresDataSource.getRepository(UserSession);
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  // ─── Redis helpers ──────────────────────────────────────────────────────

  /**
   * Read the current value of a user's session generation counter.
   *
   * A missing counter reads as 0. Returns `null` when Redis cannot answer, which
   * callers treat as "the cache cannot be trusted at all".
   */
  private async readGeneration(userId: string): Promise<number | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(sessionGenKey(userId));
      if (raw === null || raw === undefined) return 0;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return null;
    }
  }

  /**
   * Read the cached active-session records for a user, if they are still current.
   *
   * Currency is decided by the generation counter, never by comparing clocks:
   * several pods write this cache and issue these tokens, and their clocks
   * disagree. An envelope whose generation no longer matches is discarded, which
   * covers a session added since the snapshot *and* a revocation an in-flight
   * reader might otherwise write back over.
   *
   * Anything not in the current shape — including caches written by an earlier
   * build — is treated as a miss, so validation falls through to Mongo and the
   * entry is rewritten. In particular this keeps a legacy entry, which carried no
   * client, from vouching for a token on an application it was not issued for.
   */
  private async getCachedSessions(userId: string): Promise<SessionCacheEnvelope | null> {
    if (!this.redis) return null;
    try {
      const [cached, generation] = await Promise.all([
        this.redis.getJSON<any>(sessionCacheKey(userId)),
        this.readGeneration(userId),
      ]);

      if (generation === null) return null;
      if (!cached || typeof cached !== 'object') return null;
      if (typeof cached.gen !== 'number' || !Array.isArray(cached.sessions)) return null;
      if (cached.gen !== generation) {
        logger.debug(
          `[SecurityService] Session cache for ${userId} is stale (gen ${cached.gen} != ${generation})`
        );
        return null;
      }

      return { gen: cached.gen, sessions: cached.sessions };
    } catch {
      // Redis failures should never block the auth path – fall through.
      return null;
    }
  }

  /**
   * Write the active-session records into Redis against the generation they were
   * read at.
   *
   * `gen` must be the counter value observed *before* the sessions were read from
   * Mongo. Any mutation in between bumps the counter past it, so this envelope is
   * retired the moment it is written — which is exactly what stops a reader that
   * started before a revocation from resurrecting the sessions it cleared.
   */
  private async setCachedSessions(
    userId: string,
    sessions: CachedSessionRecord[],
    gen: number | null
  ): Promise<void> {
    if (!this.redis || gen === null) return;
    try {
      const envelope: SessionCacheEnvelope = { gen, sessions };
      await this.redis.setJSON(sessionCacheKey(userId), envelope, SESSION_CACHE_TTL);
    } catch {
      // Best-effort – log but don't propagate.
      logger.warn(`[SecurityService] Failed to write session cache for ${userId}`);
    }
  }

  /**
   * Retire a user's cached session set, so the next validation reads Mongo.
   *
   * Implemented as a counter bump rather than a delete. A delete races: a reader
   * that loaded Mongo before the change can write its snapshot back *after* the
   * delete and undo it, which for `expireTokens` means a revoked token quietly
   * keeps working until the entry expires. Bumping the counter instead retires
   * every envelope built before this moment, including one that has not been
   * written yet.
   */
  async invalidateSessionCache(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const key = sessionGenKey(userId);
      await this.redis.incr(key);
      await this.redis.expire(key, SESSION_GEN_TTL);
    } catch {
      logger.warn(`[SecurityService] Failed to retire session cache for ${userId}`);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  /**
   * Resolve a user document from either a Mongo ObjectId string or an email address.
   */
  private async resolveUser(
    userIdOrEmail: string
  ): Promise<Reactory.Models.IUserDocument> {
    let user: Reactory.Models.IUserDocument | null = null;

    if (ObjectId.isValid(userIdOrEmail)) {
      user = await User.findById(new ObjectId(userIdOrEmail)).exec() as unknown as Reactory.Models.IUserDocument;
    } else {
      user = await User.findOne({ email: userIdOrEmail.toLowerCase().trim() }).exec() as unknown as Reactory.Models.IUserDocument;
    }

    if (isNil(user)) {
      throw new Error(`User not found for identifier: ${userIdOrEmail}`);
    }

    return user;
  }

  /**
   * Build a JWT payload and sign it.
   * Returns the result **and** the resolved lifetime label for persistence.
   */
  private buildToken(
    user: Reactory.Models.IUserDocument,
    options: CreateTokenOptions = {}
  ): { result: CreateTokenResult; lifetime: string } {
    const {
      JWT_ISSUER = 'id.reactory.net',
      JWT_SUB = 'reactory-auth',
      JWT_AUD = 'app.reactory.net',
      SECRET_SAUCE,
    } = process.env;

    if (!SECRET_SAUCE) {
      throw new Error(
        'JWT secret is not configured. Please set the SECRET_SAUCE environment variable.'
      );
    }

    // Determine expiry
    let expMoment: moment.Moment;
    let lifetimeLabel: string;

    if (options.expiresInAmount !== undefined && options.expiresInUnit) {
      expMoment = moment().add(
        options.expiresInAmount as DurationInputArg1,
        options.expiresInUnit as DurationInputArg2
      );
      lifetimeLabel = 'custom';
    } else {
      const key = options.lifetime ?? 'standard';
      const preset = LIFETIME_PRESETS[key];
      expMoment = moment().add(preset.amount, preset.unit);
      lifetimeLabel = key;
    }

    const iat = moment().valueOf();
    const exp = expMoment.valueOf();
    const userId = (user._id as any)?.toString();

    const payload = {
      iss: options.issuer ?? JWT_ISSUER,
      sub: options.subject ?? JWT_SUB,
      aud: options.audience ?? JWT_AUD,
      exp,
      iat,
      userId,
      refresh: uuid(),
      name: `${user.firstName} ${user.lastName}`,
      ...(options.customClaims ?? {}),
    };

    const token = jwt.encode(payload, SECRET_SAUCE);

    return {
      result: {
        token,
        payload,
        expiresAt: expMoment.toISOString(),
        userId,
      },
      lifetime: lifetimeLabel,
    };
  }

  /**
   * Persist a new session row to PostgreSQL (best-effort, non-blocking).
   */
  private async persistSessionHistory(
    user: Reactory.Models.IUserDocument,
    sessionId: string,
    payload: CreateTokenResult['payload'],
    lifetime: string,
    options: CreateTokenOptions
  ): Promise<void> {
    try {
      const session = new UserSession();
      session.sessionId = sessionId;
      session.userId = (user._id as any)?.toString();
      session.email = user.email ?? '';
      session.host = options.host ?? 'cli';
      session.clientKey = options.clientKey ?? 'system';
      session.issuer = payload.iss;
      session.subject = payload.sub;
      session.audience = payload.aud;
      session.refreshToken = payload.refresh;
      session.issuedAt = payload.iat;
      session.expiresAt = payload.exp;
      session.lifetime = lifetime;
      session.status = 'active';
      session.userAgent = options.userAgent ?? '';
      session.ipAddress = options.ipAddress ?? '';

      await this.sessionRepo.save(session);
    } catch (err: any) {
      // Non-fatal – the Mongo session still works
      logger.warn(
        `[SecurityService] Failed to persist session to PostgreSQL: ${err.message}`
      );
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /**
   * Create a JWT token for the given user.
   *
   * Write-through: Mongo sessionInfo → Redis cache invalidation → PG session history
   */
  async createToken(
    userIdOrEmail: string,
    options: CreateTokenOptions = {}
  ): Promise<CreateTokenResult> {
    const user = await this.resolveUser(userIdOrEmail);
    const { result, lifetime } = this.buildToken(user, options);
    const sessionId = uuid();
    const host = options.host ?? 'cli';
    const clientKey = options.clientKey ?? 'system';

    // Persist to Mongo sessionInfo (source of truth for the JWT strategy),
    // through the same pruning/capping/atomic-append path a browser login uses
    // so a CLI-issued token behaves identically to an interactive one.
    const existing: SessionInfoEntry[] = Array.isArray((user as any).sessionInfo)
      ? (user as any).sessionInfo
      : [];
    const { keep, evict } = computeEvictions(existing, clientKey);
    // A unique slot, not one derived from client and host: `createToken` is an
    // explicit request for a *new* token, so it must never lose a slot race to an
    // existing session and hand back something no session backs.
    const { session, payload } = buildSessionEntry(
      result.payload,
      host,
      clientKey,
      sessionId,
      sessionId
    );

    // `sid` is added by buildSessionEntry, so the token has to be signed from
    // the payload that was actually stored.
    result.payload = payload as CreateTokenResult['payload'];
    result.token = jwt.encode(payload, process.env.SECRET_SAUCE);

    (user as any).sessionInfo = [...keep, session];
    const { claimed } = await appendSession({
      userId: result.userId,
      session,
      evict,
      touchLastLogin: false,
    });
    if (!claimed) {
      throw new Error(
        `Could not record a session for user ${result.userId}; refusing to return a token that cannot authenticate`
      );
    }

    // Retire the cached session set so the next JWT validation sees this session
    await this.invalidateSessionCache(result.userId);

    // Persist to PostgreSQL session history
    await this.persistSessionHistory(user, sessionId, result.payload, lifetime, options);

    logger.info(
      `[SecurityService] Token created for user ${user.email} (lifetime=${lifetime}, expires ${result.expiresAt})`
    );

    return result;
  }

  /**
   * Create a short-lived token (default: 15 minutes).
   */
  async createShortLivedToken(
    userIdOrEmail: string,
    options: Omit<CreateTokenOptions, 'lifetime'> = {}
  ): Promise<CreateTokenResult> {
    return this.createToken(userIdOrEmail, { ...options, lifetime: 'short' });
  }

  /**
   * Create a long-lived token (default: 30 days).
   */
  async createLongLivedToken(
    userIdOrEmail: string,
    options: Omit<CreateTokenOptions, 'lifetime'> = {}
  ): Promise<CreateTokenResult> {
    return this.createToken(userIdOrEmail, { ...options, lifetime: 'long' });
  }

  /**
   * Expire (clear) all active session tokens for users matching the given criteria.
   *
   * 1. Clears sessionInfo[] on the Mongo user document (blocks future JWT validation)
   * 2. Invalidates the Redis session cache
   * 3. Marks all matching rows in PG session history as 'revoked'
   */
  async expireTokens(criteria: ExpireTokensCriteria): Promise<ExpireTokensResult> {
    const { userId, email, emailPattern, reason } = criteria;

    if (!userId && !email && !emailPattern) {
      throw new Error(
        'expireTokens requires at least one of: userId, email, or emailPattern'
      );
    }

    let users: Reactory.Models.IUserDocument[] = [];

    if (userId) {
      const u = await User.findById(new ObjectId(userId)).exec();
      if (u) users.push(u as unknown as Reactory.Models.IUserDocument);
    } else if (email) {
      const u = await User.findOne({ email: email.toLowerCase().trim() }).exec();
      if (u) users.push(u as unknown as Reactory.Models.IUserDocument);
    } else if (emailPattern) {
      let regex: RegExp;
      try {
        regex = new RegExp(emailPattern, 'i');
      } catch {
        throw new Error(`Invalid email regex pattern: ${emailPattern}`);
      }
      const found = await User.find({ email: { $regex: regex } }).exec();
      users = found as unknown as Reactory.Models.IUserDocument[];
    }

    const revokedBy = this.context.user
      ? (this.context.user as any)._id?.toString() ?? 'system'
      : 'system';
    const revokedAt = new Date();

    let usersAffected = 0;
    let sessionsCleared = 0;
    const errors: { userId: string; error: string }[] = [];

    for (const user of users) {
      const uid = (user as any)._id?.toString() ?? 'unknown';
      try {
        const sessions: any[] = Array.isArray((user as any).sessionInfo)
          ? (user as any).sessionInfo
          : [];
        const count = sessions.length;

        // 1. Clear Mongo sessions. An atomic field update rather than a
        //    document save, so a login racing this revocation cannot be
        //    resurrected from a stale in-memory copy of the rest of the document.
        (user as any).sessionInfo = [];
        await User.updateOne({ _id: (user as any)._id }, { $set: { sessionInfo: [] } }).exec();

        // 2. Invalidate Redis cache
        await this.invalidateSessionCache(uid);

        // 3. Mark PG session rows as revoked
        try {
          await this.sessionRepo
            .createQueryBuilder()
            .update(UserSession)
            .set({
              status: 'revoked',
              revokedAt,
              revokedBy,
              revocationReason: reason ?? 'admin_action',
            })
            .where('"userId" = :uid AND status = :status', { uid, status: 'active' })
            .execute();
        } catch (pgErr: any) {
          logger.warn(`[SecurityService] PG revocation update failed for ${uid}: ${pgErr.message}`);
        }

        sessionsCleared += count;
        usersAffected++;

        logger.info(
          `[SecurityService] Cleared ${count} session(s) for user ${(user as any).email}`
        );
      } catch (err: any) {
        errors.push({ userId: uid, error: err.message });
        logger.error(
          `[SecurityService] Failed to expire tokens for user ${(user as any).email}: ${err.message}`
        );
      }
    }

    return { usersAffected, sessionsCleared, errors };
  }

  /**
   * List the active session tokens stored on a user document.
   *
   * Refreshes the Redis cache on every read so JWT strategy lookups stay warm.
   */
  async listActiveTokens(userIdOrEmail: string): Promise<ActiveTokenSummary[]> {
    const user = await this.resolveUser(userIdOrEmail);
    const now = moment();

    const sessions: any[] = Array.isArray((user as any).sessionInfo)
      ? (user as any).sessionInfo
      : [];

    // Deliberately does not warm the session cache. The generation a cache entry
    // is written against has to be read before the sessions it describes, and
    // this method resolves the user by email or id first — so it cannot know
    // which counter to read until after the read it would be describing.
    // Validation populates the cache on first use anyway; warming it from an
    // admin listing would buy nothing and risk writing an entry against the
    // wrong generation.
    // Annotated rather than `satisfies`: the pinned TypeScript in this repo
    // predates that operator and cannot parse it. A return-type annotation gives
    // the same excess-property and shape checking.
    return sessions.map((session: any): ActiveTokenSummary => {
      const exp = session.jwtPayload?.exp
        ? moment(session.jwtPayload.exp)
        : null;
      const iat = session.jwtPayload?.iat
        ? moment(session.jwtPayload.iat)
        : null;

      return {
        sessionId: session.id ?? 'unknown',
        host: session.host ?? 'unknown',
        client: session.client ?? 'unknown',
        expiresAt: exp ? exp.toISOString() : null,
        issuedAt: iat ? iat.toISOString() : null,
        isValid: exp ? exp.isAfter(now) : false,
      };
    });
  }

  /**
   * Retrieve the durable session history from PostgreSQL for a given user.
   * Returns all sessions (active, expired, revoked) ordered by creation date desc.
   */
  async getSessionHistory(
    userIdOrEmail: string,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<SessionHistoryEntry[]> {
    const user = await this.resolveUser(userIdOrEmail);
    const uid = (user._id as any)?.toString();

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .where('session."userId" = :uid', { uid })
      .orderBy('session."createdAt"', 'DESC');

    if (options.status) {
      qb.andWhere('session.status = :status', { status: options.status });
    }

    qb.take(options.limit ?? 50).skip(options.offset ?? 0);

    const rows = await qb.getMany();

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      email: r.email,
      host: r.host,
      clientKey: r.clientKey,
      lifetime: r.lifetime,
      status: r.status,
      issuedAt: r.issuedAt ? Number(r.issuedAt) : null,
      expiresAt: r.expiresAt ? Number(r.expiresAt) : null,
      revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      revocationReason: r.revocationReason,
      revokedBy: r.revokedBy,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    }));
  }
  /**
   * Validate whether a refresh token is part of an active session for the user.
   *
   * Reads Redis cache first — if the cache contains the token array, validation
   * completes without touching Mongo at all. On cache-miss it falls through to
   * the Mongo sessionInfo[] and populates the cache for subsequent requests.
   *
   * **No DB writes** — safe to call on every JWT request.
   */
  async validateSession(
    userId: string,
    refreshToken: string,
    options: ValidateSessionOptions = {}
  ): Promise<boolean> {
    return (await this.resolveSessionState(userId, refreshToken, options)) === 'valid';
  }

  /**
   * As `validateSession`, but says *why* a token was refused: `revoked` when no
   * live session carries it, `client_mismatch` when one does but it belongs to
   * another application. Callers that report on auth failures want the two apart.
   */
  async resolveSessionState(
    userId: string,
    refreshToken: string,
    options: ValidateSessionOptions = {}
  ): Promise<SessionState> {
    const { clientKey } = options;

    // 1. Try Redis. A current envelope is authoritative in both directions —
    //    `getCachedSessions` has already discarded anything a mutation retired,
    //    so a token it does not name really has no session.
    const cached = await this.getCachedSessions(userId);
    if (cached !== null) {
      const state = sessionStateFor(cached.sessions, refreshToken, { clientKey });
      if (state === 'client_mismatch') {
        logger.debug(
          `[SecurityService] Session for user ${userId} is scoped to another client than ${clientKey}`
        );
      }
      return state;
    }

    // 2. Fall through to Mongo, noting the generation *before* the read so the
    //    envelope we write is retired by anything that happens during it.
    try {
      const gen = await this.readGeneration(userId);
      const sessions = await readSessions(userId);
      await this.setCachedSessions(
        userId,
        toCachedRecords(sessions.filter((s) => isSessionLive(s))),
        gen
      );
      return sessionStateFor(sessions, refreshToken, { clientKey });
    } catch {
      // If we can't read the user's sessions the token cannot be honoured.
      return 'revoked';
    }
  }

  /**
   * Whether a `lastLogin` touch should actually be written.
   *
   * Claims a short-lived Redis marker and reports `false` while one is already
   * held, collapsing a stream of requests into one write per minute per
   * user/application. Without this, every authenticated request on every pod
   * writes the same document — and for the shared anonymous account, which every
   * visitor of an application authenticates as, that is sustained write
   * contention on a single document rather than useful bookkeeping.
   *
   * With no Redis available it always returns `true`, keeping the previous
   * behaviour rather than silently dropping the timestamp.
   */
  private async shouldTouch(userId: string, clientId?: string): Promise<boolean> {
    if (!this.redis) return true;
    try {
      return await this.redis.setIfAbsent(
        `${TOUCH_MARKER_PREFIX}${userId}:${clientId ?? 'none'}`,
        '1',
        TOUCH_THROTTLE_SECONDS
      );
    } catch {
      // Redis unavailable — fall back to writing, as before.
      return true;
    }
  }

  /**
   * Fire-and-forget update of lastLogin timestamps on the user document and,
   * when a clientId is provided, the matching membership entry.
   *
   * Uses atomic updateOne to avoid full-document save race conditions that
   * could overwrite sessionInfo, and is throttled — see `shouldTouch`.
   */
  async touchSession(userId: string, clientId?: string): Promise<void> {
    try {
      if (!(await this.shouldTouch(userId, clientId))) return;

      const now = new Date();
      if (clientId && ObjectId.isValid(clientId)) {
        await User.updateOne(
          { _id: new ObjectId(userId), 'memberships.clientId': new ObjectId(clientId) },
          { $set: { lastLogin: now, 'memberships.$.lastLogin': now } }
        ).exec();
        return;
      }

      await User.updateOne(
        { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId },
        { $set: { lastLogin: now } }
      ).exec();
    } catch (err: any) {
      logger.warn(
        `[SecurityService] touchSession failed for user ${userId}: ${err.message}`
      );
    }
  }
}

export default SecurityService;
export { SecurityService };
