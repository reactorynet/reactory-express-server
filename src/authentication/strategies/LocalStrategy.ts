import { User } from '@reactory/server-modules/reactory-core/models'
import logger from '@reactory/server-core/logging';
import { BasicVerifyFunctionWithRequest, BasicStrategy } from 'passport-http';
import Helpers, { OnDoneCallback } from './helpers';
import { Application } from 'express';
import passport from 'passport';
import Reactory from '@reactory/reactory-core';


const authenticate: BasicVerifyFunctionWithRequest = async (req: Reactory.Server.ReactoryExpressRequest, username: string, password: string, done: OnDoneCallback) => {
  const { context } = req;
  context.debug(`Authenticating with local strategy`)
  
  // @ts-ignore
  const user: Reactory.Models.IUserDocument = await User.findOne({ email : username }).exec();

  if (!user) {
    done(null, false, { message: 'Incorrect Credentials Supplied' });
    return;
  }

// @ts-ignore
if (user.validatePassword(password) === true) {
    const loginToken = await Helpers.generateLoginToken(user);
    req.user = user;
    req.context.user = user;
    done(null, loginToken);
  } else {
    done(null, false, { message: 'Incorrect Credentials Supplied, If you have forgotten your password, use the forgot password link' });
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