import { User } from '@reactory/server-modules/core/models'
import logger from '@reactory/server-core/logging';
import { BasicVerifyFunctionWithRequest, BasicStrategy } from 'passport-http';
import Helpers, { OnDoneCallback } from './helpers';
import { Application } from 'express';
import passport from 'passport';
import Reactory from '@reactory/reactory-core';


const authenticate: BasicVerifyFunctionWithRequest = async (req: Reactory.Server.ReactoryExpressRequest, username: string, password: string, done: OnDoneCallback) => {
  const { context } = req;
  context.debug(`Authenticating with local strategy`)
  User.findOne({ email: username }).then((userResult) => {
    if (userResult === null || userResult === undefined) {
      done(null, false, { message: 'Incorrect Credentials Supplied' });
      return;
    }
    if (userResult.validatePassword(password) === true) {
      Helpers.generateLoginToken(userResult).then((loginToken: string) => {
        logger.info('User logged in and session added');
        req.user = userResult;
        req.context.user = userResult;
        done(null, loginToken);
      });
    } else {
      done(null, false, { message: 'Incorrect Credentials Supplied, If you have forgotten your password, use the forgot password link' });
    }
  }).catch((error) => {
    logger.error(`Authentication Error ${error.message}`);
    done(error);
  });
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