import { User } from '@reactory/server-modules/reactory-core/models'
import logger from '@reactory/server-core/logging';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import moment from 'moment';
import { OnDoneCallback } from './helpers';
import { isNil } from 'lodash';
import amq from '@reactory/server-core/amq';
import AuthTelemetry from './telemetry';
import { ISecurityService } from '@reactory/server-modules/reactory-core/services/SecurityService/types';


const JwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    ExtractJwt.fromUrlQueryParameter("auth_token")
  ]),
  secretOrKey: process.env.SECRET_SAUCE || 'secret-key-needs-to-be-set',
  passReqToCallback: true,
}

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
  if (payload.exp !== null) {
    if (moment(payload.exp).isBefore(moment())) {
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordFailure('jwt', clientKey, 'token_expired', duration);
      return done(null, false);
    }
  } else { 
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('jwt', clientKey, 'no_expiration', duration);
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

      // Validate the token's refresh id against active sessions.
      // Prefer the SecurityService (Redis cache → Mongo fallback) when the
      // request context is available; otherwise fall back to a direct in-memory
      // check so the strategy still works during early bootstrap.
      if (payload.refresh) {
        let sessionValid = false;

        if (request.context) {
          try {
            const securityService = request.context.getService<ISecurityService>(
              'core.SecurityService@1.0.0'
            );
            sessionValid = await securityService.validateSession(
              payload.userId,
              payload.refresh
            );
          } catch {
            // SecurityService not available (e.g. startup) — fall through
            // to the direct Mongo check below.
            const sessions: any[] = Array.isArray((user as any).sessionInfo)
              ? (user as any).sessionInfo
              : [];
            sessionValid =
              sessions.length === 0 ||
              sessions.some(
                (s: any) => s.jwtPayload?.refresh === payload.refresh
              );
          }
        } else {
          // No context yet — direct check
          const sessions: any[] = Array.isArray((user as any).sessionInfo)
            ? (user as any).sessionInfo
            : [];
          sessionValid =
            sessions.length === 0 ||
            sessions.some(
              (s: any) => s.jwtPayload?.refresh === payload.refresh
            );
        }

        if (!sessionValid) {
          AuthTelemetry.recordFailure('jwt', clientKey, 'session_revoked', duration);
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