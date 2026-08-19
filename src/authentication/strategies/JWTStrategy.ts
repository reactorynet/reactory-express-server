import { User } from '@reactory/server-modules/reactory-core/models'
import logger from '@reactory/server-core/logging';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import moment from 'moment';
import { OnDoneCallback } from './helpers';
import { isNil } from 'lodash';
import amq from '@reactory/server-core/amq';
import AuthTelemetry from './telemetry';
import { ISecurityService } from '@reactory/server-modules/reactory-core/services/SecurityService/types';
import {
  readSessions,
  resolveSessionState,
  SessionInfoEntry,
  SessionState,
} from '@reactory/server-modules/reactory-core/services/SecurityService/sessions';


const JwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    ExtractJwt.fromUrlQueryParameter("auth_token")
  ]),
  secretOrKey: process.env.SECRET_SAUCE || 'secret-key-needs-to-be-set',
  passReqToCallback: true,
}

/** Telemetry failure reason for each way a session-backed token can be refused. */
const SESSION_FAILURE_REASON: Record<Exclude<SessionState, 'valid'>, string> = {
  revoked: 'session_revoked',
  client_mismatch: 'session_client_mismatch',
};

/**
 * Resolve a session-backed token against the user's live sessions.
 *
 * Prefers the SecurityService (Redis cache → Mongo) and falls back to reading
 * sessionInfo directly when it cannot be resolved — during early bootstrap, or
 * on a request with no Reactory context. Both routes apply the same matching
 * rules, so a token's fate does not depend on which one ran.
 */
const resolveTokenSessionState = async (
  request: Reactory.Server.ReactoryExpressRequest,
  payload: any,
  clientKey: string
): Promise<SessionState> => {
  if (request.context?.getService) {
    try {
      const securityService = request.context.getService<ISecurityService>(
        'core.SecurityService@1.0.0'
      );
      if (typeof securityService?.resolveSessionState === 'function') {
        return await securityService.resolveSessionState(payload.userId, payload.refresh, {
          clientKey,
        });
      }
      const valid = await securityService.validateSession(payload.userId, payload.refresh, {
        clientKey,
      });
      return valid ? 'valid' : 'revoked';
    } catch {
      // SecurityService unavailable — fall through to the direct read below.
    }
  }

  let sessions: SessionInfoEntry[] = [];
  try {
    sessions = await readSessions(payload.userId);
  } catch {
    // If sessionInfo cannot be read at all we cannot prove the session is gone.
    // Rejecting here would lock every user out of a running server whose Mongo
    // read failed, so the signed, unexpired token is honoured.
    return 'valid';
  }

  return resolveSessionState(sessions, payload.refresh, { clientKey });
};

const JWTAuthentication = new JwtStrategy(JwtOptions, (request: Reactory.Server.ReactoryExpressRequest, payload: any, done: OnDoneCallback) => {
  const startTime = Date.now();
  const clientKey = request.context?.partner?.key || 'api';

  // Track attempt
  AuthTelemetry.recordAttempt('jwt', clientKey);

  if(JwtOptions.secretOrKey === 'secret-key-needs-to-be-set') { 
    logger.error('JWT Secret not set, please set the SECRET_SAUCE environment variable');
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('jwt', clientKey, 'secret_not_set', duration);
    return done(null, false);
  }

  logger.debug(`JWT Auth executing`, payload);
  
  // Anonymous user (special case)
  if (payload.userId === '-1') {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordSuccess('jwt', clientKey, duration, 'ANON');
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

  // Check token expiration
  if (isNil(payload.exp)) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('jwt', clientKey, 'no_expiration', duration);
    return done(null, false);
  }

  if (moment(payload.exp).isBefore(moment())) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('jwt', clientKey, 'token_expired', duration);
    return done(null, false);
  }

  if (!payload.userId) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('jwt', clientKey, 'no_user_id', duration);
    return done(null, false);
  }

  // ── Read-only validation path ─────────────────────────────────────────
  // 1. Load user from DB (read)
  // 2. Validate the session via SecurityService (Redis → Mongo, no writes)
  // 3. Fire-and-forget touchSession() to update lastLogin asynchronously
  User.findById(payload.userId)
    .then(async (userResult) => {
      const duration = (Date.now() - startTime) / 1000;

      if (isNil(userResult)) {
        AuthTelemetry.recordFailure('jwt', clientKey, 'user_not_found', duration);
        return done(null, false);
      }

      // Cast once for reuse
      const user = userResult as unknown as Reactory.Models.IUserDocument;

      // ── Session validation ────────────────────────────────────────────
      // Only tokens that were issued *with* a session are checked against one.
      // `sid` is written into the payload by the login path, so its presence is
      // the signal — and it is signed, so it cannot be dropped by a caller to
      // dodge the check. Tokens minted out of band (password-reset and
      // assessment links, the reactor CLI, system tokens) carry no `sid` and are
      // authenticated on signature and expiry alone, exactly as before; they
      // were never recorded in sessionInfo, so checking them against it would
      // reject every one of them.
      if (payload.sid) {
        const state = await resolveTokenSessionState(request, payload, clientKey);

        if (state !== 'valid') {
          const reason = SESSION_FAILURE_REASON[state];
          AuthTelemetry.recordFailure('jwt', clientKey, reason, duration);
          logger.debug(
            `JWT session rejected for user ${payload.userId} on client ${clientKey}: ${reason}`
          );
          return done(null, false);
        }
      }

      // ── Set user on context (read-only, no DB write) ──────────────────
      if (request.context) {
        request.context.user = user;
        if (request.context.partner) {
          if (user.hasRole(request.context.partner._id?.toString() ?? '', 'ANON')) {
            request.context.user.anon = true;
          }
        }        
      }

      // ── Async touchSession (fire-and-forget) ──────────────────────────
      // Updates lastLogin on user + membership without blocking the response.
      if (request.context) {
        try {
          const securityService = request.context.getService<ISecurityService>(
            'core.SecurityService@1.0.0'
          );
          const partnerId = request.context.partner?._id?.toString();
          securityService
            .touchSession(payload.userId, partnerId)
            .catch((err) => {
              logger.warn(`[JWTStrategy] touchSession fire-and-forget failed: ${err.message}`);
            });
        } catch {
          // SecurityService not available — skip touch.
        }
      }

      // Track success
      AuthTelemetry.recordSuccess('jwt', clientKey, duration, (user as any)._id?.toString());

      amq.raiseWorkFlowEvent('user.authenticated', {
        user,
        payload,
        method: 'bearer-token',
      });
      return done(null, user);
    })
    .catch((error) => {
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordFailure('jwt', clientKey, 'database_error', duration);
      logger.error('JWT authentication database error', error);
      return done(null, false);
    });
});

export default JWTAuthentication;