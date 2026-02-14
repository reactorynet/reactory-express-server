import { User } from '@reactory/server-modules/reactory-core/models'
import logger from '@reactory/server-core/logging';
import { BasicVerifyFunctionWithRequest, BasicStrategy } from 'passport-http';
import Helpers, { OnDoneCallback } from './helpers';
import { Application } from 'express';
import passport from 'passport';
import Reactory from '@reactory/reactory-core';
import AuthTelemetry from './telemetry';


const authenticate: BasicVerifyFunctionWithRequest = async (req: Reactory.Server.ReactoryExpressRequest, username: string, password: string, done: OnDoneCallback) => {
  const startTime = Date.now();
  const { context } = req;
  const clientKey = context?.partner?.key || 'api';
  
  // Track attempt
  AuthTelemetry.recordAttempt('local', clientKey);
  
  context.debug(`Authenticating with local strategy`)
  
  try {
    // @ts-ignore
    const user: Reactory.Models.IUserDocument = await User.findOne({ email : username }).exec();

    if (!user) {
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordFailure('local', clientKey, 'user_not_found', duration);
      done(null, false, { message: 'Incorrect Credentials Supplied' });
      return;
    }

    // @ts-ignore
    if (user.validatePassword(password) === true) {
      const loginToken = await Helpers.generateLoginToken(user);
      req.user = user;
      req.context.user = user;
      
      // Update membership lastLogin if partner exists
      if (context.partner) {
        const membership = user.memberships.find(m => 
          m.clientId.toString() === context.partner._id.toString()
        );
        if (membership) {
          membership.lastLogin = new Date();
          await user.save(); // Save again after updating membership
        }
      }
      
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordSuccess('local', clientKey, duration, user._id.toString());
      
      done(null, loginToken);
    } else {
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordFailure('local', clientKey, 'invalid_password', duration);
      done(null, false, { message: 'Incorrect Credentials Supplied, If you have forgotten your password, use the forgot password link' });
    }
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('local', clientKey, 'authentication_error', duration);
    logger.error('Local authentication error', error);
    done(error, false);
  }
}


const ReactoryLocalStrategy = new BasicStrategy({ 
  passReqToCallback: true, 
  realm: process.env.AUTH_REALM || 'Reactory'
}, authenticate);

export const useReactoryLocalRoutes = (app: Application) => {

  app.post(
    '/login',
    passport.authenticate('basic', { session: false }),
    (req, res) => {
      res.json({ user: req.user });
    },
  );

}

export default ReactoryLocalStrategy;