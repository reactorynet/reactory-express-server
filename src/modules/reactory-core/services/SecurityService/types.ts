import Reactory from '@reactorynet/reactory-core';

/**
 * Token lifetime category
 */
export type TokenLifetime = 'short' | 'standard' | 'long';

/**
 * Options for creating a JWT token
 */
export interface CreateTokenOptions {
  /** Lifetime preset: 'short' (15m), 'standard' (24h), 'long' (30d) */
  lifetime?: TokenLifetime;
  /** Custom expiry amount (overrides lifetime preset) */
  expiresInAmount?: number;
  /** Custom expiry unit: 'minutes' | 'hours' | 'days' | 'weeks' */
  expiresInUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  /** JWT issuer (defaults to env JWT_ISSUER) */
  issuer?: string;
  /** JWT subject (defaults to env JWT_SUB) */
  subject?: string;
  /** JWT audience (defaults to env JWT_AUD) */
  audience?: string;
  /** Additional custom claims to embed in the token */
  customClaims?: Record<string, unknown>;
  /** Host / IP that originated the request */
  host?: string;
  /** ReactoryClient key (or 'cli' / 'system') */
  clientKey?: string;
  /** User-agent string at request time */
  userAgent?: string;
  /** IP address at request time */
  ipAddress?: string;
}

/**
 * Result returned after a token is created
 */
export interface CreateTokenResult {
  /** The signed JWT string */
  token: string;
  /** Payload embedded in the JWT */
  payload: {
    iss: string;
    sub: string;
    aud: string;
    exp: number;
    iat: number;
    userId: string;
    refresh: string;
    name: string;
    [key: string]: unknown;
  };
  /** ISO string of the expiry date/time */
  expiresAt: string;
  /** User id the token was created for */
  userId: string;
}

/**
 * Criteria for locating users whose tokens should be expired
 */
export interface ExpireTokensCriteria {
  /** Expire tokens for a single user by Mongo ObjectId string */
  userId?: string;
  /** Expire tokens for a single user by email address */
  email?: string;
  /** Expire tokens for all users whose email matches this regex pattern string */
  emailPattern?: string;
  /** Optional reason for expiry (stored in PG session history) */
  reason?: string;
}

/**
 * Summary of a token expiry operation
 */
export interface ExpireTokensResult {
  /** Number of users whose tokens were cleared */
  usersAffected: number;
  /** Total number of session entries removed */
  sessionsCleared: number;
  /** Any per-user errors that occurred during the operation */
  errors: { userId: string; error: string }[];
}

/**
 * A brief summary of an active session / token
 */
export interface ActiveTokenSummary {
  /** Session ID stored on the user document */
  sessionId: string;
  /** Host from which the session was created */
  host: string;
  /** Client (ReactoryClient key) for the session */
  client: string;
  /** Expiry date of the JWT embedded in the session */
  expiresAt: string | null;
  /** Issue date of the JWT */
  issuedAt: string | null;
  /** Whether the token is still valid (not yet expired) */
  isValid: boolean;
}

/**
 * An entry from the PostgreSQL session history table.
 */
export interface SessionHistoryEntry {
  id: number;
  sessionId: string;
  userId: string;
  email: string;
  host: string | null;
  clientKey: string | null;
  lifetime: string | null;
  status: string;
  issuedAt: number | null;
  expiresAt: number | null;
  revokedAt: string | null;
  revocationReason: string | null;
  revokedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service interface for JWT security management.
 * Consumed by the SecurityCli, GraphQL resolvers, and AI macro tools.
 */
export interface ISecurityService extends Reactory.Service.IReactoryService {
  /**
   * Create a standard (24h) JWT token for a user identified by userId or email.
   */
  createToken(
    userIdOrEmail: string,
    options?: CreateTokenOptions
  ): Promise<CreateTokenResult>;

  /**
   * Create a short-lived token (default 15 minutes).
   * Equivalent to createToken with lifetime='short'.
   */
  createShortLivedToken(
    userIdOrEmail: string,
    options?: Omit<CreateTokenOptions, 'lifetime'>
  ): Promise<CreateTokenResult>;

  /**
   * Create a long-lived token (default 30 days).
   * Equivalent to createToken with lifetime='long'.
   */
  createLongLivedToken(
    userIdOrEmail: string,
    options?: Omit<CreateTokenOptions, 'lifetime'>
  ): Promise<CreateTokenResult>;

  /**
   * Expire (clear) all active session tokens for users matching the given criteria.
   * At least one of userId, email, or emailPattern must be provided.
   */
  expireTokens(criteria: ExpireTokensCriteria): Promise<ExpireTokensResult>;

  /**
   * List the active session tokens stored on a user document.
   */
  listActiveTokens(userIdOrEmail: string): Promise<ActiveTokenSummary[]>;

  /**
   * Retrieve the durable session history from PostgreSQL for a given user.
   * Returns all sessions (active, expired, revoked) ordered by creation date desc.
   */
  getSessionHistory(
    userIdOrEmail: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<SessionHistoryEntry[]>;

  /**
   * Validate whether a refresh token is part of an active session for the user.
   * Uses Redis cache first, falls back to Mongo sessionInfo[] on cache-miss.
   * Pure read — no DB writes.
   */
  validateSession(userId: string, refreshToken: string): Promise<boolean>;

  /**
   * Record a "touch" on the user and (optionally) the matching membership.
   * This updates lastLogin timestamps. It is designed to be called
   * fire-and-forget so the JWT auth hot-path is never blocked by writes.
   */
  touchSession(
    userId: string,
    clientId?: string
  ): Promise<void>;
}
