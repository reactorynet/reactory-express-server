import Reactory from '@reactorynet/reactory-core';
import jwt from 'jwt-simple';
import moment, { DurationInputArg1, DurationInputArg2 } from 'moment';
import { v4 as uuid } from 'uuid';
import { isNil } from 'lodash';
import { UserValidationError } from '@reactory/server-core/exceptions';
import { User } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';
import amq from '@reactory/server-core/amq';
import type { ISecurityService } from '@reactory/server-modules/reactory-core/services/SecurityService/types';
import {
  buildSessionEntry,
  computeEvictions,
  findReusableSession,
  isSessionReuseEnabled,
  persistSession,
  readSessions,
  readSignedPayload,
  SessionInfoEntry,
} from '@reactory/server-modules/reactory-core/services/SecurityService/sessions';
import AuthTelemetry from './telemetry';

const jwtSecret = process.env.SECRET_SAUCE;

/**
 * Drop the cached active-session set for a user so the next JWT validation
 * reads Mongo and sees a session that was just added or removed.
 *
 * The Redis client is taken from the request context rather than opened here:
 * a second connection per process, owned by no service and closed by nobody,
 * was leaking handles and duplicating the cache key format. Invalidation is
 * best-effort by design — `SecurityService.validateSession` stamps its cache
 * writes and falls through to Mongo for tokens newer than the stamp, so a
 * missed invalidation delays nothing and rejects nothing.
 */
export const invalidateUserSessionCache = async (
  userId: string,
  context?: Reactory.Server.IReactoryContext
): Promise<void> => {
  if (!userId || !context?.getService) return;
  try {
    const securityService = context.getService<ISecurityService>('core.SecurityService@1.0.0');
    await securityService?.invalidateSessionCache(userId);
    logger.debug(`[Helpers] Invalidated session cache for user ${userId}`);
  } catch (err: any) {
    // SecurityService may be unavailable (startup, or no Redis configured).
    logger.debug(`[Helpers] Could not invalidate session cache for user ${userId}: ${err?.message}`);
  }
};

const resolveUserId = (user: Reactory.Models.IUserDocument): string | null => {
  const id = (user as any)?._id;
  if (!id) return null;
  return typeof id.toString === 'function' ? id.toString() : String(id);
};

export type OnDoneCallback = (error: Error | null, user?: Partial<Reactory.Models.IUserDocument> | string | false, info?: any) => void;

export interface OAuthProfile {
  id: string;
  displayName: string;
  username?: string;
  name?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
  emails?: {
    value: string;
    verified?: boolean;
  }[];
  photos?: {
    value: string;
  }[];
}


export default class Helpers {
  static JwtAuth = (payload: any, done: Function) => {
    logger.debug(`JWT Auth executing`, payload);
    if (payload.userId === '-1') {
      return done(null, {
        _id: "ANON",
        id: -1,
        firstName: 'Guest',
        lastName: 'User',
        roles: ['ANON'],
        memberships: [],
        avatar: null,
        anon: true,
      });
    }

    if (isNil(payload.exp)) {
      return done(null, false);
    }

    if (moment(payload.exp).isBefore(moment())) {
      logger.info('token expired');
      return done(null, false);
    }

    if (payload.userId) {
      User.findById(payload.userId).then((userResult) => {
        if (isNil(userResult)) {
          return done(null, false);
        }
        //req.user = userResult;
        amq.raiseWorkFlowEvent('user.authenticated', { user: userResult, payload, method: 'bearer-token' });
        return done(null, userResult);
      });
    } else return done(null, false);
  }

  static jwtMake = (payload: any) => { return jwt.encode(payload, jwtSecret); };

  static jwtTokenForUser = (user: Reactory.Models.IUserDocument, options: {
    exp?: number,
    iat?: number,
    iss?: string,
    sub?: string,
    aud?: string,
  } = {}) => {
    if (isNil(user)) throw new UserValidationError('User object cannot be null', { context: 'jwtTokenForUser' });

    const {
      JWT_ISSUER = 'id.reactory.net',
      JWT_SUB = 'reactory-auth',
      JWT_AUD = 'app.reactory.net',
      JWT_EXP_AMOUNT = 24,
      JWT_EXP_UNIT = 'h',
    } = process.env;

    const authOptions = {
      iss: JWT_ISSUER,
      sub: JWT_SUB,
      aud: JWT_AUD,
      exp: moment().add(
        JWT_EXP_AMOUNT as DurationInputArg1, 
        JWT_EXP_UNIT as DurationInputArg2
      ).valueOf(),
      iat: moment().valueOf(),
      ...options,
    };

    return {
      ...authOptions,
      userId: `${user._id.toString()}`,
      refresh: uuid(),
      name: `${user.firstName} ${user.lastName}`,
    };
  }

  static getJwtTokenForUser = (user: Reactory.Models.IUserDocument, options: {
    exp?: number,
    iat?: number,
    iss?: string,
    sub?: string,
    aud?: string,
  } = {}) => {  
    return Helpers.jwtMake(Helpers.jwtTokenForUser(user, options));
  }

  /**
   * Record a session for `token` against the given user, application and host.
   *
   * Expired sessions are pruned and the per-client / global caps applied in the
   * same write. Sessions belonging to *other* applications are never touched —
   * that is the whole point of the multi-tenant model: signing into app B must
   * leave the session held against app A alone.
   *
   * The returned payload is the one that was actually signed: it carries a `sid`
   * claim naming the session, which is what lets request authentication tell a
   * revoked session-backed token from a token that was never session-backed.
   */
  static addSession = async (
    user: Reactory.Models.IUserDocument,
    token: any,
    ip = '-',
    clientId = 'not-set',
    context?: Reactory.Server.IReactoryContext
  ): Promise<{ user: Reactory.Models.IUserDocument; payload: any; sessionId: string; reused: false }> => {
    const userId = resolveUserId(user);
    const existing = userId
      ? await Helpers.readSessionsSafely(userId, user)
      : (Array.isArray(user.sessionInfo) ? (user.sessionInfo as unknown as SessionInfoEntry[]) : []);

    const { keep, evict } = computeEvictions(existing, clientId);
    const sessionId = uuid();
    const { session, payload } = buildSessionEntry(token, ip, clientId, sessionId);

    (user as any).sessionInfo = [...keep, session];

    if (userId) {
      try {
        await persistSession({ userId, session, evict });
      } catch (err) {
        logger.error('Error persisting user session info', err);
      }
      await invalidateUserSessionCache(userId, context);
    } else {
      // No id to address — an unsaved or mocked document. Fall back to a
      // document save so callers that rely on the in-memory array still work.
      try {
        await (user as any).save?.();
      } catch (err) {
        logger.error('Error saving user session info', err);
      }
    }

    return { user, payload, sessionId, reused: false };
  }

  /**
   * Read the authoritative session list, tolerating a `User` model that cannot
   * be queried (unit tests, early bootstrap) by falling back to the document.
   */
  private static readSessionsSafely = async (
    userId: string,
    user: Reactory.Models.IUserDocument
  ): Promise<SessionInfoEntry[]> => {
    try {
      return await readSessions(userId);
    } catch {
      return Array.isArray(user.sessionInfo)
        ? (user.sessionInfo as unknown as SessionInfoEntry[])
        : [];
    }
  }

  /**
   * Issue a login token for a user against a partner application.
   *
   * When the user already holds a live session for this same application *from
   * this same host*, that session's token is handed back verbatim rather than a
   * new one being stacked — so a page reload or a second tab does not multiply
   * sessions, while a different device or a different application still gets its
   * own. Set `REACTORY_SESSION_REUSE=false` to always mint a new session.
   */
  static generateLoginToken = async (
    user: Reactory.Models.IUserDocument,
    ip = 'none',
    clientId = 'not-set',
    context?: Reactory.Server.IReactoryContext
  ): Promise<{
    id: string,
    firstName: string,
    lastName: string,
    token: string,
  }> => {
    logger.info(`generating Login token for user ${user.firstName} ${user.lastName}`);

    try {
      const userId = resolveUserId(user);
      let token: string | null = null;

      if (userId && isSessionReuseEnabled()) {
        const sessions = await Helpers.readSessionsSafely(userId, user);
        const reusable = findReusableSession(sessions, clientId, ip);
        const signedPayload = reusable ? readSignedPayload(reusable) : null;
        if (signedPayload) {
          logger.debug(
            `Reusing session ${reusable.id} for user ${userId} on client ${clientId} from ${ip}`
          );
          token = Helpers.jwtMake(signedPayload);
          // Nothing is added to sessionInfo on this path, so record the login
          // directly rather than relying on the session write to do it.
          try {
            await (User as any).updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).exec();
          } catch (err: any) {
            logger.debug(`Could not update lastLogin for reused session: ${err?.message}`);
          }
        }
      }

      if (token === null) {
        const { payload } = await Helpers.addSession(
          user,
          Helpers.jwtTokenForUser(user),
          ip,
          clientId,
          context
        );
        token = Helpers.jwtMake(payload);
      }

      user.lastLogin = moment().valueOf(); // eslint-disable-line

      // Record JWT token generation in telemetry
      try {
        AuthTelemetry.recordTokenGeneration(user._id.toString(), 'system');
      } catch (telemetryError) {
        logger.error('Failed to record token generation metric', telemetryError);
        // Continue - don't fail auth due to telemetry error
      }

      return {
        id: typeof user?._id?.toHexString === 'function' ? user._id.toHexString() : user?._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        token,
      };
    } catch (error) {
      logger.error('Error generating login token', error);
      throw error;
    }
  }; 
}