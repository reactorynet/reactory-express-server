/**
 * Facebook OAuth2 Authentication Strategy
 * 
 * Provides Facebook social login using OAuth2 flow.
 * Users can authenticate using their Facebook accounts.
 */

import { encoder } from '@reactory/server-core/utils';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import Helpers, { OnDoneCallback } from '../helpers';
import { Application, Response } from 'express';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager, ErrorSanitizer, AuthAuditLogger } from '../security';
import AuthTelemetry from '../telemetry';

const {
  FACEBOOK_APP_ID = 'FACEBOOK_APP_ID',
  FACEBOOK_APP_SECRET = 'FACEBOOK_APP_SECRET',
  FACEBOOK_APP_CALLBACK_URL = 'http://localhost:4000/auth/facebook/callback',
  FACEBOOK_OAUTH_SCOPE = 'email,public_profile',
} = process.env;

/**
 * Facebook OAuth Strategy Configuration
 * Handles authentication via Facebook OAuth2
 */
const FacebookOAuthStrategy: passport.Strategy = new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: FACEBOOK_APP_CALLBACK_URL,
  profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(large)'],
  passReqToCallback: true,
  scope: FACEBOOK_OAUTH_SCOPE.split(','),
}, async (
  req: Reactory.Server.ReactoryExpressRequest,
  accessToken: string,
  refreshToken: any,
  profile: any,
  done: OnDoneCallback
) => {
  const startTime = Date.now();
  let clientKey = 'api';
  
  try {
    // Log authentication attempt
    logger.info('Facebook authentication attempt', {
      profileId: profile.id,
      displayName: profile.displayName,
    });

    const { context, session } = req;
    
    // Record OAuth callback received
    AuthTelemetry.recordOAuthCallback('facebook', clientKey);
    
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract user information from Facebook profile
    const email = profile.emails && profile.emails[0]?.value;
    const facebookId = profile.id;
    const { name, displayName } = profile;
    const avatarUrl = profile.photos && profile.photos[0]?.value;

    if (!email) {
      const duration = (Date.now() - startTime) / 1000;
      logger.warn('Facebook profile missing email', { profileId: profile.id });
      AuthAuditLogger.logFailure(profile.id, 'facebook', 'No email in profile');
      AuthTelemetry.recordFailure('facebook', clientKey, 'no_email', duration);
      return done(new Error('Facebook profile does not include email'), false);
    }

    // Ensure system user is logged in for user operations
    if (!context.user) {
      context.user = await userService.findUserWithEmail(process.env.REACTORY_APPLICATION_EMAIL);
    }

    // Resolve partner/client from state
    if (!context.partner) {
      // @ts-ignore
      if (!session.authState) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Missing auth state in session');
        AuthTelemetry.recordFailure('facebook', clientKey, 'missing_state', duration);
        return done(new Error('Invalid state'), false);
      }

      // @ts-ignore
      const stateData = StateManager.validateState(session.authState);
      if (!stateData) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Invalid or expired state');
        AuthTelemetry.recordFailure('facebook', clientKey, 'invalid_state', duration);
        AuthTelemetry.recordCSRFValidation('facebook', false);
        return done(new Error('Invalid state'), false);
      }
      
      // Validate CSRF state
      AuthTelemetry.recordCSRFValidation('facebook', true);

      clientKey = stateData['x-client-key'];
      const partner: Reactory.Models.IReactoryClientDocument = await ReactoryClient.findOne({
        key: clientKey
      }).exec() as Reactory.Models.IReactoryClientDocument;

      if (!partner) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Client not found', { clientKey });
        AuthTelemetry.recordFailure('facebook', clientKey, 'client_not_found', duration);
        return done(new Error('Client not found'), false);
      }

      context.partner = partner;
    } else {
      clientKey = context.partner.key;
    }
    
    // Track attempt with actual client key
    AuthTelemetry.recordAttempt('facebook', clientKey);

    // Build authentication properties
    const authProps = {
      facebookId,
      displayName,
      accessToken,
    };

    // Find or create user
    let user = await userService.findUserWithEmail(email);
    if (!user) {
      logger.info('Creating new user from Facebook profile', { email });
      user = await userService.createUser({
        email,
        firstName: name?.givenName || displayName?.split(' ')[0] || 'Facebook',
        lastName: name?.familyName || displayName?.split(' ').slice(1).join(' ') || 'User',
      });
    }

    // Update avatar
    if (avatarUrl) {
      user.avatar = avatarUrl;
      user.avatarProvider = 'facebook';
    }

    // Update or create Facebook authentication record
    const facebookAuth = user.authentications.find(auth => auth.provider === 'facebook');
    if (!facebookAuth) {
      user.authentications.push({
        provider: 'facebook',
        lastLogin: new Date(),
        props: authProps,
      });
      logger.info('Added Facebook authentication for user', { userId: user._id, email });
    } else {
      facebookAuth.lastLogin = new Date();
      facebookAuth.props = authProps;
      logger.info('Updated Facebook authentication for user', { userId: user._id, email });
    }

    // Save user
    await user.save();

    // Log successful authentication
    AuthAuditLogger.logSuccess(user._id.toString(), 'facebook', {
      email: user.email,
      facebookId,
    });

    // Generate login token
    const loginToken = await Helpers.generateLoginToken(user);
    
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordSuccess('facebook', clientKey, duration, user._id.toString());
    
    logger.info('Facebook authentication successful', {
      userId: user._id,
      email: user.email,
    });

    return done(null, loginToken);

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('facebook', clientKey, 'authentication_error', duration);
    logger.error('Facebook authentication error', { error });
    AuthAuditLogger.logFailure(
      profile?.id || 'unknown',
      'facebook',
      'Authentication error',
      { error: error.message }
    );
    const safeError = ErrorSanitizer.sanitizeError(error, { provider: 'facebook' });
    return done(new Error(safeError), false);
  }
});

/**
 * Configure Facebook OAuth Routes
 * Sets up the start, callback, and failure endpoints
 */
export const useFacebookRoutes = (app: Application) => {
  /**
   * Facebook OAuth Start Endpoint
   * Initiates the Facebook OAuth flow
   */
  app.get(
    '/auth/facebook/start',
    (req: Reactory.Server.ReactoryExpressRequest, res: Response, next) => {
      try {
        // Create state for CSRF protection
        const state = StateManager.createState({
          'x-client-key': req.query['x-client-key'],
          'x-client-pwd': req.query['x-client-pwd'],
          flow: 'facebook',
        });

        // Store state in session
        // @ts-ignore
        req.session.authState = state;

        logger.debug('Starting Facebook OAuth flow', {
          clientKey: req.query['x-client-key'],
          state,
        });

        // Redirect to Facebook
        passport.authenticate('facebook', {
          scope: FACEBOOK_OAUTH_SCOPE.split(','),
          passReqToCallback: true,
          state,
        })(req, res, next);
      } catch (error) {
        logger.error('Error starting Facebook OAuth', { error });
        res.status(500).send({
          error: 'An error occurred while trying to authenticate with Facebook',
        });
      }
    }
  );

  /**
   * Facebook OAuth Failure Endpoint
   * Handles authentication failures
   */
  app.get('/auth/facebook/failure', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
    logger.warn('Facebook authentication failed', {
      query: req.query,
      session: req.session?.id,
    });

    res.status(401).send({
      error: 'Authentication with Facebook failed',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Facebook OAuth Callback Endpoint
   * Handles the OAuth callback from Facebook
   */
  app.get(
    '/auth/facebook/callback',
    (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
      const { context } = req;
      const failureRedirectUrl = context.partner
        ? `${context.partner.siteUrl}/auth/facebook/failure`
        : '/auth/facebook/failure';

      const onCompletion = (err: string, user: {
        id: string;
        firstName: string;
        lastName: string;
        token: string;
      } | boolean) => {
        if (err) {
          logger.error('Facebook OAuth callback error', { error: err });
          res.status(500).send({
            error: 'An error occurred while trying to authenticate with Facebook',
            timestamp: new Date().toISOString(),
          });
        } else {
          if (!user) {
            logger.warn('Facebook authentication returned no user');
            res.status(302).redirect(failureRedirectUrl);
          } else {
            const successUrl = context.partner
              ? `${context.partner.siteUrl}?auth_token=${(user as { token: string }).token}`
              : `/?auth_token=${(user as { token: string }).token}`;

            logger.info('Facebook authentication complete, redirecting', {
              successUrl: successUrl.split('?')[0], // Log URL without token
            });

            res.status(302).redirect(successUrl);
          }
        }
      };

      // Authenticate with Facebook
      passport.authenticate('facebook', {
        failureRedirect: failureRedirectUrl,
        passReqToCallback: true,
        scope: FACEBOOK_OAUTH_SCOPE.split(','),
      }, onCompletion)(req, res);
    }
  );
};

export default FacebookOAuthStrategy;

