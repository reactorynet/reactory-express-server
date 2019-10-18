import passport from 'passport';
import jwt from 'jwt-simple';
import moment from 'moment';
import uuid from 'uuid';
import { isNil } from 'lodash';
// import LocalStrategy from 'passport-local';
import { BasicStrategy } from 'passport-http';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { OIDCStrategy } from 'passport-azure-ad';
import OAuth2 from 'simple-oauth2';
import { User, ReactoryClient } from '../models/index';
import { UserValidationError } from '../exceptions';
import logger from '../logging';
import graph from '../azure/graph';
import { createUserForOrganization, updateUserProfileImage } from '../application/admin/User';
import amq from '../amq';

const jwtSecret = process.env.SECRET_SAUCE;

class AuthConfig {
    static Configure = (app) => {
      app.use(passport.initialize());
      // Passport calls serializeUser and deserializeUser to
      // manage users
      passport.serializeUser((user, done) => {
      // Use the OID property of the user as a key
        //logger.debug('AuthConfig.passport.serializeUser((user, done))', user);
        // users[user.profile.oid] = user;
        done(null, user.oid);
      });

      passport.deserializeUser((id, done) => {
        //logger.debug('AuthConfig.passport.deserializeUser', id);
        done(null, users[id]);
      });


      passport.use(new BasicStrategy({ passReqToCallback: true }, AuthConfig.BasicAuth));
      passport.use(new JwtStrategy(AuthConfig.JwtOptions, AuthConfig.JwtAuth));

      const oauth2 = OAuth2.create({
        client: {
          id: process.env.OAUTH_APP_ID,
          secret: process.env.OAUTH_APP_PASSWORD,
        },
        auth: {
          tokenHost: process.env.OAUTH_AUTHORITY,
          authorizePath: process.env.OAUTH_AUTHORIZE_ENDPOINT,
          tokenPath: process.env.OAUTH_TOKEN_ENDPOINT,
        },
      });

      // Callback function called once the sign-in is complete
      // and an access token has been obtained
      async function signInComplete(req, iss, sub, profile, accessToken, refreshToken, params, done) {
        logger.info('Sign in Complete', {
          iss,
          sub,
          profile,
          params: params || 'no-params',
          done,
        });

        if (!profile.oid) {
          // return done(new Error('No OID found in user profile.'), null);
          logger.info('There is no oid, bad login, redirect to client with failure');
        }

        let loggedInUser = null;
        let _existing = null;
        try {
          // this is the user that is returned by the microsft graph api
          const user = await graph.getUserDetails(accessToken);
          logger.info(`User retrieved from Microsoft Graph API ${user.email || user.userPrincipalName}`);
          if (user) {
            // Add properties to profile
            profile['email'] = user.mail ? user.mail : user.userPrincipalName; //eslint-disable-line
            _existing = await User.findOne({ email: profile.email }).then();
            if (_existing === null) {
              loggedInUser = {
                email: user.mail, firstName: user.givenName, lastName: user.surname, avatarProvider: 'microsoft',
              };
              logger.info(`Must create new user with email ${user.mail}`, loggedInUser);
              const createResult = await createUserForOrganization(loggedInUser, profile.oid, null, ['USER'], 'microsoft', global.partner, null);
              if (createResult.user) {
                _existing = createResult.user;
              }
            }

            if(user.avatar) {              
              _existing.avatar = updateUserProfileImage(_existing, user.avatar, true, false);              
            }          
          }
        } catch (err) {
          done(err, null);
        }

        // Create a simple-oauth2 token from raw tokens
        if (isNil(_existing) === true) {
          logger.error(`Could not create user via ms login ${loggedInUser.email}`);
          done(null, false);
        } else {
          const oauthToken = oauth2.accessToken.create(params);
          _existing.setAuthentication({
            provider: 'microsoft',
            props: { oid: profile, oauthToken, accessToken },
            lastLogin: new Date().valueOf(),
          });
          global.user = _existing;
          logger.info(`OAuth Token Generated for user: ${_existing.email} - should patch user with 3rd party auth data`, oauthToken);
          // Save the profile and tokens in user storage
          // users[profile.oid] = { profile, oauthToken };
          return done(null, { ..._existing, oid: profile.oid });
        }
      }

      // Configure OIDC strategy
      //TODO: Reactory holds an integration as an application
      // ideally this should be done per request
      const redirectUrl = `${process.env.OAUTH_REDIRECT_URI}`;
      logger.debug(`Application is configure to use ${redirectUrl} for OIDC strategy`);
      passport.use(new OIDCStrategy(
        {
          identityMetadata: `${process.env.OAUTH_AUTHORITY}${process.env.OAUTH_ID_METADATA}`,
          clientID: process.env.OAUTH_APP_ID,
          responseType: 'code id_token',
          responseMode: 'form_post',
          redirectUrl,
          allowHttpForRedirectUrl: true,
          clientSecret: process.env.OAUTH_APP_PASSWORD,
          validateIssuer: false,
          passReqToCallback: true,
          scope: process.env.OAUTH_SCOPES.split(' '),
        },
        signInComplete,
      ));


      app.post(
        '/login',
        passport.authenticate('basic', { session: false }),
        (req, res) => {
          res.json({ user: req.user });
        },
      );

      app.get(
        '/auth/microsoft/openid/:clientKey', (req, res, next) => {
          logger.debug(`login live get ${req.params.clientKey}`);
          passport.authenticate(
            'azuread-openidconnect',
            {
              response: res,
              prompt: 'login',
              failureRedirect: '/auth/microsoft/openid/failed',
              failureFlash: true,
              redirectUrl: `${process.env.OAUTH_REDIRECT_URI}/${req.params.clientKey}`
            },
          )(req, res, next);
        },
        (req, res) => {
          logger.info(`/auth/microsoft/openid/${req.params.clientKey} -> next`, { user: global.user, partner: global.partner });

          res.redirect(`${global.partner.siteUrl}/nologin/?auth_token=${AuthConfig.jwtTokenForUser(global.user)}`);
        },
      );

      app.post(
        '/auth/microsoft/openid/complete/:clientKey',
        async (req, res, next) => {
          logger.debug(`Response from login.live received for ${req.params.clientKey}`);
          global.partner = await ReactoryClient.findOne({ key: req.params.clientKey }).then();
          passport.authenticate(
            'azuread-openidconnect',
            {
              response: res,
              failureRedirect: '/auth/microsoft/openid/failed',
              failureFlash: false,
            },
          )(req, res, next);
        },
        (req, res) => {
          const token = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(global.user));
          res.redirect(`${global.partner.siteUrl}/?auth_token=${token}`);
        },
      );
    };

    static JwtOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    }

    static JwtAuth = (payload, done) => {
      logger.info('JWT Auth executing');
      if (payload.userId === '-1') {
        global.user = {
          id: -1,
          firstName: 'Guest',
          lastName: 'User',
          roles: ['ANON'],
          memberships: [],
          avatar: null,
          anon: true,
        };
        return done(null, true);
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
          global.user = userResult;
          amq.raiseWorkFlowEvent('user.authenticated', { user: userResult, payload, method: 'bearer-token' });
          return done(null, true);
        });
      } else return done(null, false);
    }

    static jwtMake = (payload) => { return jwt.encode(payload, jwtSecret); };

    /**
     * Generates a JWT token for a user, uses default options
        iss: 'id.reactory.net', // issuer is id.reactory.net
        sub: 'reactory-auth',
        aud: 'app.reactory.net',
        exp: moment().add('24', 'h').valueOf(),
        iat: moment().valueOf(),
     *
     */
    static jwtTokenForUser = (user, options = {}) => {
      if (isNil(user)) throw new UserValidationError('User object cannot be null', { context: 'jwtTokenForUser' });

      const authOptions = {
        iss: 'id.reactory.net',
        sub: 'reactory-auth',
        aud: 'app.reactory.net',
        exp: moment().add('24', 'h').valueOf(),
        iat: moment().valueOf(),
        ...options,
      };

      return {
        ...authOptions,
        userId: user._id.toString(), // eslint-disable-line no-underscore-dangle
        refresh: uuid(),
        name: `${user.firstName} ${user.lastName}`,
        memberships: user.memberships,
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

    static BasicAuth = (req, username, password, done) => {
      logger.info(`Authenticating User: ${username}`);
      User.findOne({ email: username }).then((userResult) => {
        if (userResult === null) done(null, false, 'username not found');
        if (userResult.validatePassword(password) === true) {
          AuthConfig.generateLoginToken(userResult).then((loginToken) => {
            logger.info('User logged in and session added');
            global.user = userResult;
            done(null, loginToken);
          });
        } else {
          done(null, false, 'Could not authenticate the account');
        }
      }).catch((error) => {
        logger.error('Authentication Error', error);
        done(null, false, 'System is unable to authenticate user due to an error');
      });
    };
}

export default AuthConfig;
