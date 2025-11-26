
import { 
  encoder 
} from '@reactory/server-core/utils';
//@ts-ignore
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Helpers, { OnDoneCallback } from '../helpers';
import { Application, Response } from 'express';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import AuthTelemetry from '../telemetry';

const { 
  GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET',
  GOOLGE_CALLBACK_URL = 'http://localhost:4000/auth/google/callback',
  GOOGLE_OAUTH_SCOPE = 'openid email profile https://www.googleapis.com/auth/userinfo.profile',
  
} = process.env

const GoogleOAuthStrategy: passport.Strategy = new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: GOOLGE_CALLBACK_URL,
  passReqToCallback: true,
  scope: GOOGLE_OAUTH_SCOPE.split(' '),
}, async (req: Reactory.Server.ReactoryExpressRequest, 
    accessToken: string, 
    refreshToken: any, 
    profile: any, 
    done: OnDoneCallback) => {
  const startTime = Date.now();
  let clientKey = 'api';
  
  try {
    // This callback function is called when the user has successfully authenticated with Google.
    // The `profile` object contains information about the authenticated user.
        
    // const googleProfile = await getGoogleProfile(authority);
    logger.info('Google Profile', { profile })
    const { context, session } = req;
    
    // Record OAuth callback received
    AuthTelemetry.recordOAuthCallback('google', clientKey);
    
    const userService  = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    const email = profile.emails && profile.emails[0].value;
    const googleId = profile.id;
    const { name, displayName } = profile;
  
    if (!context.user) {
      // log in the system user.
      context.user = await userService.findUserWithEmail(process.env.REACTORY_APPLICATION_EMAIL);
    }
    
    if(!context.partner) {
      // check if we have oauthState in the session
      // @ts-ignore
      if(!session.authState) {
        const duration = (Date.now() - startTime) / 1000;
        AuthTelemetry.recordFailure('google', clientKey, 'missing_state', duration);
        return done(new Error('Invalid state'), false);
      }
      // @ts-ignore
      const state = encoder.decodeState(session.oauthState as string);
      if(!state) {
        const duration = (Date.now() - startTime) / 1000;
        AuthTelemetry.recordFailure('google', clientKey, 'invalid_state', duration);
        AuthTelemetry.recordCSRFValidation('google', false);
        return done(new Error('Invalid state'), false);
      }

      // Validate CSRF state
      AuthTelemetry.recordCSRFValidation('google', true);

      clientKey = state['x-client-key'];    

      const partner: Reactory.Models.IReactoryClientDocument = await ReactoryClient.findOne({ 
        key: clientKey 
      }).exec() as Reactory.Models.IReactoryClientDocument;

      if(!partner) {
        const duration = (Date.now() - startTime) / 1000;
        AuthTelemetry.recordFailure('google', clientKey, 'client_not_found', duration);
        return done(new Error('Client not found'), false);
      }

      context.partner = partner;
    } else {
      clientKey = context.partner.key;
    }
    
    // Track attempt with actual client key
    AuthTelemetry.recordAttempt('google', clientKey);
  
    const authProps = {
      googleId,
      displayName,
      accessToken,
    }

    let user = await userService.findUserWithEmail(email);
    if(!user) {
      user = await userService.createUser({
        email,
        firstName: name.givenName,
        lastName: name.familyName,
      });
    }
    user.avatar = profile.photos && profile.photos[0].value;
    user.avatarProvider = 'google';
    const googleAuth = user.authentications.find(auth => auth.provider === 'google');
    if(!googleAuth) {
      user.authentications.push({ 
        provider: 'google',
        lastLogin: new Date(),
        props: authProps
      });
    } else {
      googleAuth.lastLogin = new Date();
      googleAuth.props = authProps;
    }

    await user.save();
    
    Helpers.generateLoginToken(user).then((loginToken) => { 
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordSuccess('google', clientKey, duration, user._id.toString());
      return done(null, loginToken);
    }).catch((error) => {
      const duration = (Date.now() - startTime) / 1000;
      AuthTelemetry.recordFailure('google', clientKey, 'token_generation_failed', duration);
      logger.error('Failed to generate login token for Google auth', error);
      return done(error, false);
    });

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('google', clientKey, 'authentication_error', duration);
    logger.error('Google authentication error', error);
    return done(error as Error, false);
  }
});

export const useGoogleRoutes = (app: Application) => { 
  app.get(
    '/auth/google/start', 
    (req: Reactory.Server.ReactoryExpressRequest, res: Response, next) => {
      try {
        const state = encoder.encodeState({
          "x-client-key": req.query['x-client-key'],
          "x-client-pwd": req.query['x-client-pwd'],
          "flow": "google"
        });
        // @ts-ignore
        req.session.authState = state;
        passport.authenticate('google', { 
          scope: GOOGLE_OAUTH_SCOPE.split(' '),
          passReqToCallback: true,
          state
        })(req, res, next);
      } catch (ex){
        logger.error('An error occurred while trying to authenticate with Google', ex);        
        res.status(500).send({ error: 'An error occurred while trying to authenticate with Google', ex });
      }
    } 
  );

  app.get('/auth/google/failure', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => { 
    res.status(401).send({ error: 'Authentication with Google failed' });
  });

  app.get(
    '/auth/google/callback', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
      const { context } = req;
      const failureRedirectUrl = `${context.partner.siteUrl}/auth/google/failure`;
      
      const onCompletion = (err: string, user: {
        id: string,
        firstName: string,
        lastName: string,
        token: string,
      } | boolean) => {
        if(err) {
          logger.error('An error occurred while authenticating with Google', err);
          res.status(500).send({ error: 'An error occurred while trying to authenticate with Google', err });
        } else {
          if(!user) { 
            res.status(302)
              .redirect(failureRedirectUrl);

          } else {
            res.status(302)
              .redirect(`${context.partner.siteUrl}?auth_token=${(user as { token: string }).token}`);
          }
          
        }
      };

      passport.authenticate('google', { 
        failureRedirect: failureRedirectUrl,
        passReqToCallback: true,
        scope: GOOGLE_OAUTH_SCOPE.split(' '),
      }, onCompletion)(req, res);
    });
};

export default GoogleOAuthStrategy;