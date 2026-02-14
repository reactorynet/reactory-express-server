import { User } from '@reactory/server-modules/reactory-core/models'
import logger from '@reactory/server-core/logging';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import moment from 'moment';
import { OnDoneCallback } from './helpers';
import { isNil } from 'lodash';
import amq from '@reactory/server-core/amq';
import AuthTelemetry from './telemetry';


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

  if (payload.userId) {
    User.findById(payload.userId).then((userResult: Reactory.Models.IUserDocument) => {
      const duration = (Date.now() - startTime) / 1000;
      
      if (isNil(userResult)) {
        AuthTelemetry.recordFailure('jwt', clientKey, 'user_not_found', duration);
        return done(null, false);
      }
      
      // Update last login timestamp
      userResult.lastLogin = new Date();
      
      // Update membership lastLogin if partner context exists
      if (request.context?.partner) {
        const membership = userResult.memberships.find((m: Reactory.Models.IMembershipDocument) => 
          m.clientId.toString() === request.context.partner._id.toString()
        );
        if (membership) {
          membership.lastLogin = new Date();
        }
      }
      
      userResult.save().catch((saveError) => {
        logger.error('Failed to update user lastLogin in JWT auth', saveError);
      });
      
      if(request.context) {        
        request.context.user = userResult;
        if(request.context.partner) {
          // only when we have a partner do we check the role
          if (userResult.hasRole(request.context.partner._id.toString(), 'ANON')) {
            request.context.user.anon = true;
          }
        }
        request.context.debug(`User ${userResult._id.toString()} authenticated and set on context: ${request.context.id}`)
      }
      
      // Track success
      AuthTelemetry.recordSuccess('jwt', clientKey, duration, userResult._id.toString());
      
      amq.raiseWorkFlowEvent('user.authenticated', { user: userResult, payload, method: 'bearer-token' });
      return done(null, userResult);
    }).catch((error) => {
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordFailure('jwt', clientKey, 'database_error', duration);
      logger.error('JWT authentication database error', error);
      return done(null, false);
    });
  } else {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('jwt', clientKey, 'no_user_id', duration);
    return done(null, false);
  }
});

export default JWTAuthentication;