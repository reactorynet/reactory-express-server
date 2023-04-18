import passport, {
  AuthenticateOptions,
  Authenticator,
  Framework,
  Profile,
  Strategy,
  PassportStatic,
  Passport
} from 'passport';

import Reactory from '@reactory/reactory-core';
import jwt from 'jwt-simple';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { isNil } from 'lodash';
// import LocalStrategy from 'passport-local';
import { Application, Request } from 'express';
import { BasicStrategy } from 'passport-http';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { OIDCStrategy } from 'passport-azure-ad';
import OAuth2 from 'simple-oauth2';
import { User, ReactoryClient } from '../models/index';
import { UserValidationError } from '../exceptions';
import * as Strategies from './strategies';
import logger from '../logging';
import graph from '@reactory/server-modules/reactory-azure/services/graph';

import { createUserForOrganization, updateUserProfileImage } from '../application/admin/User';
import amq from '../amq';
import { urlencoded } from 'body-parser';

const jwtSecret = process.env.SECRET_SAUCE;

class AuthConfig {
  static Configure = (app: Application) => {
    app.use(passport.initialize());
    // Passport calls serializeUser and deserializeUser to
    // manage users
    passport.serializeUser((user: any, done) => {
      // Use the OID property of the user as a key
      // users[user.profile.oid] = user;
      done(null, user?.oid);
    });

    passport.deserializeUser((id, done) => {
      debugger
      User.findById(id).then((user) => {
        done(null, user);
      });
    });

    // Load all strategies from the strategies directory
    Object.values(Strategies).forEach((strategy) => {
      passport.use(strategy as Strategy);
    });
    
    app.post(
      '/login',
      passport.authenticate('basic', { session: false }),
      (req, res) => {
        res.json({ user: req.user });
      },
    );

    let azure_openid_options: AuthenticateOptions

    app.get(
      '/auth/microsoft/openid/start/:clientKey', (req, res, next) => {
        logger.debug(`login live get ${req.params.clientKey}`);
        passport.authenticate(
          'azuread-openidconnect',
          {
            //response: res,                            
            prompt: 'login',
            failureRedirect: '/auth/microsoft/openid/failed',
            failureFlash: true,
            redirectUrl: `${process.env.OAUTH_REDIRECT_URI}/${req.params.clientKey}`
          },
        )(req, res, next);
      },
      (req, res) => {
        logger.info(`/auth/microsoft/openid/${req.params.clientKey} -> next`, { user: req.user.firstName, partner: req.partner.key });

        res.redirect(`${req.partner.siteUrl}/nologin/?auth_token=${AuthConfig.jwtTokenForUser(req.user)}`);
      },
    );

    app.post(
      '/auth/microsoft/openid/complete/:clientKey',
      async (req, res, next) => {
        // ;
        logger.debug(`Response from login.live received for ${req.params.clientKey}`);
        const reactory_client = await ReactoryClient.findOne({ key: req.params.clientKey }).then();
        req.partner = reactory_client;
        passport.authenticate(
          'azuread-openidconnect',
          {
            failureRedirect: `/auth/microsoft/openid/failed?x-client-key=${req.params.clientKey}`,
            failureFlash: false,
          },
        )(req, res, next);
      },
      async (req, res) => {
        logger.debug(`Completing Signing For User`, { user: req.user })
        const reactory_client: any = await ReactoryClient.findOne({ key: req.params.clientKey }).then();
        req.partner = reactory_client;
        const token = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(req.user));
        res.clearCookie("connect.sid");
        res.redirect(`${reactory_client.siteUrl}/?auth_token=${token}`);
      },
    );

    app.get('/auth/microsoft/openid/failed', async (req, res, next) => {

      const reactory_client: any = await ReactoryClient.findOne({ key: req.query['x-client-key'] }).then();
      logger.debug(`Received Failed Microsoft Login for ${req.query['x-client-key']}`);
      res.clearCookie("connect.sid");
      res.redirect(`${reactory_client.siteUrl}/login?auth_token=&message=Could not login via MS`);
    })
  };

  static JwtOptions = {
    jwtFromRequest: ExtractJwt.fromExtractors([
      ExtractJwt.fromAuthHeaderAsBearerToken(),
      ExtractJwt.fromUrlQueryParameter("auth_token")
    ]),
    secretOrKey: jwtSecret,
  }

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

    if (payload.exp !== null) {
      if (moment(payload.exp).isBefore(moment())) {
        logger.info('token expired');
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
  }

  static jwtMake = (payload: any) => { return jwt.encode(payload, jwtSecret); };

  /**
   * Generates a JWT token for a user, uses default options
      iss: 'id.reactory.net', // issuer is id.reactory.net
      sub: 'reactory-auth',
      aud: 'app.reactory.net',
      exp: moment().add('24', 'h').valueOf(),
      iat: moment().valueOf(),
   *
   */
  static jwtTokenForUser = (user: Reactory.IUser, options = {}) => {
    logger.debug(`Generating jwtToken for user ${user.email || user.id}`)

    if (isNil(user)) throw new UserValidationError('User object cannot be null', { context: 'jwtTokenForUser' });

    const authOptions = {
      iss: 'id.reactory.net',
      sub: 'reactory-auth',
      aud: 'app.reactory.net',
      exp: moment().add('24', 'h').valueOf(),
      iat: moment().valueOf(),
      ...options,
    };

    let _user = user;

    if (user && user._doc) {
      _user = user._doc;
    }

    return {
      ...authOptions,
      userId: `${_user._id ? _user._id.toString() : _user.id.toString()}`, // eslint-disable-line no-underscore-dangle
      refresh: uuid(),
      name: `${user.firstName} ${user.lastName}`,
    };
  }

  static addSession = (user, token, ip = '-', clientId = 'not-set') => {
    logger.info('adding session', {
      user, token, ip, clientId,
    });
    user.sessionInfo = [];
    user.sessionInfo.push({
      id: uuid(),
      host: ip,
      client: clientId,
      token,
    });

    return user.save();
  }

  static generateLoginToken = (user, ip = 'none') => {
    logger.info('generating Login token');
    return new Promise((resolve, reject) => {
      user.lastLogin = moment().valueOf(); // eslint-disable-line
      const jwtPayload = AuthConfig.jwtTokenForUser(user);
      AuthConfig.addSession(user, jwtPayload, ip).then((savedUser) => {
        resolve({
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          token: AuthConfig.jwtMake(jwtPayload),
        });
      }).catch((sessionSetError) => { reject(sessionSetError); });
    });
  };
}

export { default as Decorators } from './decorators';
export default AuthConfig;