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
  appendSession,
  buildSessionEntry,
  computeEvictions,
  findReusableSession,
  findSessionBySlot,
  isSessionReuseEnabled,
  readSessions,
  readSignedPayload,
  sessionSlotKey,
  SessionInfoEntry,
} from '@reactory/server-modules/reactory-core/services/SecurityService/sessions';
import AuthTelemetry from './telemetry';

const jwtSecret = process.env.SECRET_SAUCE;

/**
 * Retire the cached active-session set for a user, so the next JWT validation
 * reads Mongo and sees a session that was just added or removed.
 *
 * The Redis client is taken from the request context rather than opened here: a
 * second connection per process, owned by no service and closed by nobody, was
 * leaking handles and duplicating the cache key format.
 *
 * Best-effort, and safe to lose: retirement bumps a generation counter that
 * cached entries are checked against, so the worst case of a failed bump is one
 * extra Mongo read, never a wrong answer.
 */
export const invalidateUserSessionCache = async (
  userId: string,
  context?: Reactory.Server.IReactoryContext
): Promise<void> => {
  if (!userId || !context?.getService) return;
  try {
    const securityService = context.getService<ISecurityService>('core.SecurityService@1.0.0');
    await securityService?.invalidateSessionCache(userId);
    logger.debug(`[Helpers] Retired session cache for user ${userId}`);
  } catch (err: any) {
    // SecurityService may be unavailable (startup, or no Redis configured).
    logger.debug(`[Helpers] Could not retire session cache for user ${userId}: ${err?.message}`);
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
   * `claimed` is `false` when another request added a session for this same slot
   * first — see `generateLoginToken`, which recovers by adopting the winner's
   * session rather than issuing a token nobody has a session for.
   *
   * A write that genuinely fails **throws**. Returning a token whose session was
   * never persisted is the worst outcome available here: the login looks like it
   * worked and every subsequent request 401s.
   */
  static addSession = async (
    user: Reactory.Models.IUserDocument,
    token: any,
    ip = '-',
    clientId = 'not-set',
    context?: Reactory.Server.IReactoryContext,
    slotKey?: string
  ): Promise<{
    user: Reactory.Models.IUserDocument;
    payload: any;
    sessionId: string;
    claimed: boolean;
  }> => {
    const userId = resolveUserId(user);
    const existing = userId
      ? await Helpers.readSessionsSafely(userId, user)
      : (Array.isArray(user.sessionInfo) ? (user.sessionInfo as unknown as SessionInfoEntry[]) : []);

    const { keep, evict } = computeEvictions(existing, clientId);
    const sessionId = uuid();
    const slot = slotKey ?? sessionSlotKey(clientId, ip);
    const { session, payload } = buildSessionEntry(token, ip, clientId, sessionId, slot);

    if (!userId) {
      // No id to address — an unsaved or mocked document. Fall back to a
      // document save so callers that rely on the in-memory array still work.
      (user as any).sessionInfo = [...keep, session];
      await (user as any).save?.();
      return { user, payload, sessionId, claimed: true };
    }

    const { claimed } = await appendSession({ userId, session, evict });

    if (claimed) {
      (user as any).sessionInfo = [...keep, session];
      await invalidateUserSessionCache(userId, context);
    }

    return { user, payload, sessionId, claimed };
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
   * Note that a user signed in, on a path that writes no session.
   *
   * Routed through the SecurityService so it shares that method's throttle: for
   * the shared anonymous account a login happens on every first page load, and an
   * unconditional write here would put one more write per visitor onto the single
   * document every visitor of an application shares. Falls back to a direct write
   * when the service is unavailable.
   */
  private static recordLogin = async (
    userId: string,
    clientId: string,
    context?: Reactory.Server.IReactoryContext
  ): Promise<void> => {
    try {
      const securityService = context?.getService?.<ISecurityService>('core.SecurityService@1.0.0');
      if (securityService?.touchSession) {
        await securityService.touchSession(userId, clientId);
        return;
      }
      await (User as any).updateOne({ _id: userId }, { $set: { lastLogin: new Date() } }).exec();
    } catch (err: any) {
      logger.debug(`Could not record login for user ${userId}: ${err?.message}`);
    }
  }

  /**
   * Recover from losing the race for a session slot by re-signing the session
   * the winner created.
   *
   * The winner's session is already persisted and cache-retired, so nothing more
   * is needed than reading it back. If it cannot be found — the winner's session
   * expired in the intervening moment, or the row cannot be re-signed — the
   * login is retried once without slot contention rather than handing back a
   * token no session backs.
   */
  private static adoptSessionForSlot = async (
    user: Reactory.Models.IUserDocument,
    slot: string,
    clientId: string,
    ip: string,
    context?: Reactory.Server.IReactoryContext
  ): Promise<string> => {
    const userId = resolveUserId(user) as string;
    const sessions = await Helpers.readSessionsSafely(userId, user);
    const winner = findSessionBySlot(sessions, slot);
    const signedPayload = winner ? readSignedPayload(winner) : null;

    if (signedPayload) {
      logger.debug(
        `Adopted concurrently created session ${winner.id} for user ${userId} on client ${clientId}`
      );
      return Helpers.jwtMake(signedPayload);
    }

    // The winner's session went away between the failed claim and this read.
    // Retry on a slot of its own so the login cannot lose twice.
    logger.warn(
      `Lost the session slot for user ${userId} on client ${clientId} but could not adopt it; issuing a standalone session`
    );
    const retry = await Helpers.addSession(
      user,
      Helpers.jwtTokenForUser(user),
      ip,
      clientId,
      context,
      uuid()
    );
    if (!retry.claimed) {
      throw new Error(`Could not establish a session for user ${userId} on client ${clientId}`);
    }
    return Helpers.jwtMake(retry.payload);
  }

  /**
   * Issue a login token for a user against a partner application.
   *
   * When the user already holds a live session for this same application *from
   * this same host*, that session's token is handed back verbatim rather than a
   * new one being stacked — so a page reload or a second tab does not multiply
   * sessions, while a different device or a different application still gets its
   * own. Set `REACTORY_SESSION_REUSE=false` to always mint a new session.
   *
   * Reuse is decided by reading, then writing, so two logins arriving together —
   * a browser opening several tabs at once, or the shared anonymous account under
   * a burst of first page loads — can both find nothing to reuse. The write that
   * follows is conditional on the slot still being free, and the request that
   * loses adopts the winner's session instead of stacking a second one. Both
   * callers therefore come away with the same token, from one session.
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
          await Helpers.recordLogin(userId, clientId, context);
        }
      }

      if (token === null) {
        const slot = sessionSlotKey(clientId, ip);
        const { payload, claimed } = await Helpers.addSession(
          user,
          Helpers.jwtTokenForUser(user),
          ip,
          clientId,
          context,
          slot
        );

        if (claimed) {
          token = Helpers.jwtMake(payload);
        } else {
          token = await Helpers.adoptSessionForSlot(user, slot, clientId, ip, context);
        }
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