import { User } from '@reactory/server-modules/core/models'
import logger from '@reactory/server-core/logging';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import moment from 'moment';
import Helpers, { OnDoneCallback } from './helpers';
import { isNil } from 'lodash';
import amq from '@reactory/server-core/amq';


const JwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    ExtractJwt.fromUrlQueryParameter("auth_token")
  ]),
  secretOrKey: process.env.SECRET_SAUCE || 'secret-key-needs-to-be-set',
}

const JWTAuthentication = new JwtStrategy(JwtOptions, (payload: any, done: OnDoneCallback) => {

  if(JwtOptions.secretOrKey === 'secret-key-needs-to-be-set') { 
    logger.error('JWT Secret not set, please set the SECRET_SAUCE environment variable');
    return done(null, false);
  }

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

  if (payload.exp !== null) {
    if (moment(payload.exp).isBefore(moment())) {
      return done(null, false);
    }
  } else { return done(null, false); }

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
});

export default JWTAuthentication;