import { OIDCStrategy } from 'passport-azure-ad';
import passport from 'passport';
import { Application, Request, Response } from 'express';
import Helpers from './helpers';
import Reactory from '@reactory/reactory-core';
import ReactoryClient from '@reactory/server-modules/core/models/ReactoryClient';
import logger from '@reactory/server-core/logging';

const {
  MICROSOFT_CLIENT_ID = '123456789',
  MICROSOFT_CLIENT_SECRET = '12312312',
  MICROSOFT_TENANT_ID = 'asfadsf'
} = process.env;

const MicrosoftStrategy = new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: MICROSOFT_CLIENT_ID,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: 'http://localhost:3000/auth/microsoft/callback',
  allowHttpForRedirectUrl: true,
  clientSecret: MICROSOFT_CLIENT_SECRET,
  validateIssuer: false,
  passReqToCallback: true,
}, (req, iss, sub, profile, jwtClaims, access_token, refresh_token, params, done) => {
  // This callback function is called when the user has successfully authenticated with Microsoft.
  // The `profile` object contains information about the authenticated user.
  // You can use this information to find or create a corresponding user in your database.
  // Once you've found or created a user, you can call the `done` function to indicate success.

  const email = profile._json.emails && profile._json.emails[0];
  const avatarUrl = profile._json.picture;

  const user = {
    email,
    avatarUrl,
    microsoftId: profile.oid,
    displayName: profile.displayName,
  };

  // TODO: Find or create the user in your database
  // ...

  return done(null, user);
});

export const useMicrosoftRoutes = (app: Application) => {

  const {
    OAUTH_REDIRECT_URI = 'http://localhost:3000/auth/microsoft/openid/complete/',
  } = process.env;

  app.get('/auth/microsoft/openid/start/:clientKey', (req: Reactory.Server.ReactoryExpressRequest, res: Response, next) => {
    const {
      clientKey = 'reactory'
    } = req.params;

    passport.authenticate('azuread-openidconnect', {
      prompt: 'login',
      failureRedirect: `/auth/microsoft/openid/failure/${clientKey}`,
      failureFlash: true,
      successRedirect: `${process.env.OAUTH_REDIRECT_URI}/${clientKey}`
    })(req, res, next);
  }, (req: Reactory.Server.ReactoryExpressRequest, res) => {
    if (req?.partner?.siteUrl) {
      res.redirect(`${req.partner.siteUrl}/nologin/?auth_token=${Helpers.jwtTokenForUser(req.user as Reactory.Models.IUser)}`);
    } else {
      res.redirect(`/error?message=No siteUrl found for partner ${req.partner?.name || 'No partner'}  `)
    }
  });

  /**
   * Handles the callback from the Microsoft login
   */
  app.post(`${OAUTH_REDIRECT_URI}:clientKey`,
    async (req: Reactory.Server.ReactoryExpressRequest, res, next) => {
      const {
        log,
      } = req.context
      
      log(`Response from login.live received for ${req.params.clientKey}`)
      
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
    async (req: Reactory.Server.ReactoryExpressRequest, res) => {
      const {
        log,
      } = req.context

      log(`Completing Signing For User`, { user: req.user })
      const reactory_client: any = await ReactoryClient.findOne({ key: req.params.clientKey }).then();
      req.partner = reactory_client;
      const token = Helpers.jwtMake(Helpers.jwtTokenForUser(req.user));
      res.clearCookie("connect.sid");
      res.redirect(`${reactory_client.siteUrl}/?auth_token=${token}`);
    }
  );

  app.get('/auth/microsoft/openid/failed', async (req, res, next) => {
    const reactory_client: any = await ReactoryClient.findOne({ key: req.query['x-client-key'] }).then();
    logger.debug(`Received Failed Microsoft Login for ${req.query['x-client-key']}`);
    res.clearCookie("connect.sid");
    res.redirect(`${reactory_client.siteUrl}/error?auth_token=&message=Could not login via MS`);
  })
}

export default MicrosoftStrategy;


/**
 * 
 * 
 * const oauth2 = OAuth2.create({
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
    async function signInComplete(req: Request, iss: string, sub: string, profile: Reactory.IUser, accessToken: string, refreshToken: string, params: any, done: Function) {
      logger.info(`Sign in Complete ${profile && profile.displayName ? profile.displayName : 'NO DISPLAY NAME FOR USER'} : EXPIRES ${moment().add(params.expires_in, 'seconds').format('YYYY-MM-DD HH:mm:ss')}`);
      if (!profile.oid) {
        // return done(new Error('No OID found in user profile.'), null);
        logger.info('There is no oid, bad login, redirect to client with failure');
      }

      let loggedInUser = null;
      let _existing = null;
      try {
        // this is the user that is returned by the microsft graph api
        const user = await graph.getUserDetails(accessToken, { profileImage: true, imageSize: '120x120' });
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

            const createResult = await createUserForOrganization(loggedInUser, profile.oid, null, ['USER'], 'microsoft', req.partner, null);
            if (createResult.user) {
              _existing = createResult.user;
            }
          }

          if (user.avatar) {
            _existing.avatar = updateUserProfileImage(_existing, user.avatar, false, false);
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

        const { expires_in, refresh_token } = oauthToken.token;
        const expiresWhen = moment().add(expires_in, 'seconds');
        req.user = _existing;
        logger.info(`OAuth Token Generated for user: ${_existing.email} via MS Authentication, token expires at ${expiresWhen.format('YYYY-MM-DD HH:mm')}`);
        amq.raiseWorkflowEvent('scheduleWorkflow', { id: 'RefreshMicrosofToken', user: req.user, refresh_token, when: expiresWhen.subtract(10, 'minute') }, req.partner);
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
    const azureadStrategy = new OIDCStrategy(
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
    );
 * 
 */