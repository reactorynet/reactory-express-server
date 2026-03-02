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
} from './types';

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

/** Redis key prefix for cached active-session sets */
const REDIS_SESSION_PREFIX = 'reactory:security:sessions:';
/** Redis TTL (seconds) for cached session data – 5 minutes keeps reads fast
 *  while ensuring evictions propagate in a reasonable timeframe. */
const REDIS_SESSION_TTL = 300;

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
   * Build the Redis key that stores cached active-session refresh ids for a user.
   */
  private sessionCacheKey(userId: string): string {
    return `${REDIS_SESSION_PREFIX}${userId}`;
  }

  /**
   * Read the cached active refresh tokens from Redis for a given userId.
   * Returns `null` on cache miss so callers know to fall through to Mongo.
   */
  private async getCachedSessions(userId: string): Promise<string[] | null> {
    if (!this.redis) return null;
    try {
      return await this.redis.getJSON<string[]>(this.sessionCacheKey(userId));
    } catch {
      // Redis failures should never block the auth path – fall through.
      return null;
    }
  }

  /**
   * Write the set of active refresh tokens into Redis.
   */
  private async setCachedSessions(
    userId: string,
    refreshTokens: string[]
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setJSON(
        this.sessionCacheKey(userId),
        refreshTokens,
        REDIS_SESSION_TTL
      );
    } catch {
      // Best-effort – log but don't propagate.
      logger.warn(`[SecurityService] Failed to write session cache for ${userId}`);
    }
  }

  /**
   * Invalidate the Redis session cache for a user so the next read fetches from Mongo.
   */
  private async invalidateSessionCache(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(this.sessionCacheKey(userId));
    } catch {
      logger.warn(`[SecurityService] Failed to invalidate session cache for ${userId}`);
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

    // Persist to Mongo sessionInfo (source of truth for the JWT strategy)
    (user as any).sessionInfo = (user as any).sessionInfo ?? [];
    (user as any).sessionInfo.push({
      id: sessionId,
      host: options.host ?? 'cli',
      client: options.clientKey ?? 'system',
      jwtPayload: result.payload,
    });
    await (user as any).save();

    // Invalidate Redis cache so the next JWT validation picks up the new session
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

        // 1. Clear Mongo sessions
        (user as any).sessionInfo = [];
        await (user as any).save();

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

    // (Re)populate Redis cache with current refresh-token set
    const refreshTokens = sessions
      .map((s: any) => s.jwtPayload?.refresh)
      .filter(Boolean);
    await this.setCachedSessions((user._id as any)?.toString(), refreshTokens);

    return sessions.map((session: any) => {
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
      } satisfies ActiveTokenSummary;
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
  async validateSession(userId: string, refreshToken: string): Promise<boolean> {
    // 1. Try Redis
    const cached = await this.getCachedSessions(userId);
    if (cached !== null) {
      return cached.includes(refreshToken);
    }

    // 2. Fall through to Mongo
    try {
      const user = await this.resolveUser(userId);
      const sessions: any[] = Array.isArray((user as any).sessionInfo)
        ? (user as any).sessionInfo
        : [];

      const refreshTokens: string[] = sessions
        .map((s: any) => s.jwtPayload?.refresh)
        .filter(Boolean);

      // Populate cache for next time
      await this.setCachedSessions(userId, refreshTokens);

      return refreshTokens.includes(refreshToken);
    } catch {
      // If we can't resolve the user the session is definitively invalid
      return false;
    }
  }

  /**
   * Fire-and-forget update of lastLogin timestamps on the user document and,
   * when a clientId is provided, the matching membership entry.
   *
   * Any failure is logged and swallowed so it never impacts the caller.
   */
  async touchSession(userId: string, clientId?: string): Promise<void> {
    try {
      const user = await this.resolveUser(userId);
      (user as any).lastLogin = new Date();

      if (clientId) {
        const membership = (user as any).memberships?.find(
          (m: any) => m.clientId?.toString() === clientId
        );
        if (membership) {
          membership.lastLogin = new Date();
        }
      }

      await (user as any).save();
    } catch (err: any) {
      logger.warn(
        `[SecurityService] touchSession failed for user ${userId}: ${err.message}`
      );
    }
  }
}

export default SecurityService;
export { SecurityService };
