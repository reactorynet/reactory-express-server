/**
 * Okta Authentication Strategy
 * 
 * Provides Okta SSO authentication using OIDC (OpenID Connect).
 * Okta is an enterprise identity and access management platform.
 */

import { Strategy as OpenIDStrategy } from 'passport-openidconnect';
import passport from 'passport';
import { Application, Response } from 'express';
import Helpers, { OnDoneCallback } from '../helpers';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager, ErrorSanitizer, AuthAuditLogger } from '../security';

const {
  OKTA_CLIENT_ID = 'OKTA_CLIENT_ID',
  OKTA_CLIENT_SECRET = 'OKTA_CLIENT_SECRET',
  OKTA_DOMAIN = 'your-domain.okta.com', // e.g., dev-123456.okta.com
  OKTA_ISSUER, // Optional: defaults to https://{OKTA_DOMAIN}/oauth2/default
  OKTA_CALLBACK_URL = 'http://localhost:4000/auth/okta/callback',
} = process.env;

// Construct issuer URL
const issuerUrl = OKTA_ISSUER || `https://${OKTA_DOMAIN}/oauth2/default`;
const authorizationUrl = `https://${OKTA_DOMAIN}/oauth2/default/v1/authorize`;
const tokenUrl = `https://${OKTA_DOMAIN}/oauth2/default/v1/token`;
const userInfoUrl = `https://${OKTA_DOMAIN}/oauth2/default/v1/userinfo`;

/**
 * Okta OIDC Strategy Configuration
 * Handles authentication via Okta OpenID Connect
 */
const OktaStrategy = new OpenIDStrategy({
  issuer: issuerUrl,
  authorizationURL: authorizationUrl,
  tokenURL: tokenUrl,
  userInfoURL: userInfoUrl,
  clientID: OKTA_CLIENT_ID,
  clientSecret: OKTA_CLIENT_SECRET,
  callbackURL: OKTA_CALLBACK_URL,
  scope: ['openid', 'profile', 'email'],
  passReqToCallback: true,
}, async (
  req: any,
  issuer: string,
  profile: any,
  idToken: any,
  accessToken: string,
  refreshToken: string,
  params: any,
  done: OnDoneCallback
) => {
  try {
    logger.info('Okta authentication attempt', {
      sub: profile.id,
      displayName: profile.displayName,
      issuer: issuerUrl,
    });

    const { context } = req;
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract email from profile
    const email = profile.emails?.[0]?.value || 
                  profile._json?.email || 
                  profile._json?.preferred_username;
    
    const oktaId = profile.id; // Okta user ID (sub)
    const displayName = profile.displayName || profile._json?.name;

    if (!email) {
      logger.warn('Okta profile missing email', { sub: profile.id });
      AuthAuditLogger.logFailure(profile.id, 'okta', 'No email in profile');
      return done(new Error('Okta profile does not include email'), false);
    }

    // Ensure system user is logged in
    if (!context.user) {
      context.user = await userService.findUserWithEmail(process.env.REACTORY_APPLICATION_EMAIL);
    }

    // Partner should be set from route param
    if (!context.partner) {
      logger.error('Missing partner in context');
      return done(new Error('Client not found'), false);
    }

    // Build authentication properties
    const authProps = {
      oktaId,
      sub: profile.id,
      displayName,
      issuer: issuerUrl,
      access_token: accessToken,
      idToken: params.id_token,
    };

    // Find or create user
    let user = await userService.findUserWithEmail(email);
    if (!user) {
      logger.info('Creating new user from Okta profile', { email });
      
      // Parse name from displayName or profile
      const nameParts = displayName ? displayName.split(' ') : [];
      const firstName = profile.name?.givenName || profile._json?.given_name || nameParts[0] || 'Okta';
      const lastName = profile.name?.familyName || profile._json?.family_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User');

      user = await userService.createUser({
        email,
        firstName,
        lastName,
      });
    }

    // Update or create Okta authentication record
    const oktaAuth = user.authentications.find(auth => auth.provider === 'okta');
    if (!oktaAuth) {
      user.authentications.push({
        provider: 'okta',
        lastLogin: new Date(),
        props: authProps,
      });
      logger.info('Added Okta authentication for user', { 
        userId: user._id,
        email,
        oktaId,
      });
    } else {
      oktaAuth.lastLogin = new Date();
      oktaAuth.props = authProps;
      logger.info('Updated Okta authentication for user', { 
        userId: user._id,
        email,
        oktaId,
      });
    }

    // Handle avatar from Okta profile
    if (profile.photos && profile.photos.length > 0) {
      const avatarUrl = profile.photos[0].value;
      if (avatarUrl && !user.avatar) {
        user.avatar = avatarUrl;
        logger.debug('Added avatar from Okta profile', { userId: user._id });
      }
    }

    // Save user
    await user.save();

    // Log successful authentication
    AuthAuditLogger.logSuccess(user._id.toString(), 'okta', {
      email: user.email,
      oktaId,
      issuer: issuerUrl,
    });

    // Generate login token
    const loginToken = await Helpers.generateLoginToken(user);
    
    logger.info('Okta authentication successful', {
      userId: user._id,
      email: user.email,
      oktaId,
    });

    return done(null, loginToken);

  } catch (error) {
    logger.error('Okta authentication error', { error });
    AuthAuditLogger.logFailure(
      profile?.id || 'unknown',
      'okta',
      'Authentication error',
      { error: error.message }
    );
    const safeError = ErrorSanitizer.sanitizeError(error, { provider: 'okta' });
    return done(new Error(safeError), false);
  }
});

/**
 * Configure Okta OAuth Routes
 * Handles OIDC flow with Okta
 */
export const useOktaRoutes = (app: Application) => {
  const stateManager = new StateManager();

  /**
   * Okta OIDC Start Endpoint
   * Initiates the Okta authentication flow
   */
  app.get(
    '/auth/okta/start/:clientKey',
    async (req: any, res: Response, next) => {
      try {
        const { clientKey = 'reactory' } = req.params;

        // Resolve partner/client
        const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
        if (!partner) {
          logger.error('Client not found', { clientKey });
          return res.status(404).send({ error: 'Client not found' });
        }

        req.partner = partner;
        req.context.partner = partner;

        // Generate state for CSRF protection
        const state = stateManager.encode({ clientKey, partnerId: partner._id.toString() });

        logger.debug('Starting Okta OAuth flow', {
          clientKey,
          issuer: issuerUrl,
        });

        // Authenticate with Okta
        passport.authenticate('openidconnect', {
          state,
          failureRedirect: `/auth/okta/failure?clientKey=${clientKey}`,
        })(req, res, next);
      } catch (error) {
        logger.error('Error starting Okta OAuth', { error });
        res.status(500).send({
          error: 'An error occurred while trying to authenticate with Okta',
        });
      }
    }
  );

  /**
   * Okta OIDC Callback Endpoint
   * Handles the callback from Okta
   */
  app.get(
    '/auth/okta/callback',
    async (req: any, res: Response, next) => {
      try {
        // Validate state parameter
        const stateParam = req.query.state as string;
        if (!stateParam) {
          logger.warn('Missing state parameter in Okta callback');
          return res.redirect('/auth/okta/failure?error=missing_state');
        }

        const stateData = stateManager.decode(stateParam);
        if (!stateData || !stateData.clientKey) {
          logger.warn('Invalid state parameter in Okta callback');
          return res.redirect('/auth/okta/failure?error=invalid_state');
        }

        const { clientKey } = stateData;

        logger.debug('Okta OAuth callback received', { clientKey });

        // Resolve partner/client
        const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
        if (!partner) {
          logger.error('Client not found in callback', { clientKey });
          return res.redirect(`/auth/okta/failure?clientKey=${clientKey}`);
        }

        req.partner = partner;
        req.context.partner = partner;

        // Authenticate and handle response
        passport.authenticate('openidconnect', {
          failureRedirect: `/auth/okta/failure?clientKey=${clientKey}`,
        }, (err: any, user: any) => {
          if (err) {
            logger.error('Okta authentication error in callback', { error: err });
            return res.redirect(`/auth/okta/failure?clientKey=${clientKey}`);
          }

          if (!user) {
            logger.warn('Okta authentication returned no user');
            return res.redirect(`/auth/okta/failure?clientKey=${clientKey}`);
          }

          // Generate JWT token
          const token = typeof user === 'object' && 'token' in user 
            ? user.token 
            : Helpers.jwtMake(Helpers.jwtTokenForUser(user));

          logger.info('Okta authentication complete, redirecting', {
            clientKey,
            partnerId: partner._id,
          });

          res.clearCookie('connect.sid');
          res.redirect(`${partner.siteUrl}/?auth_token=${token}`);
        })(req, res, next);
      } catch (error) {
        logger.error('Okta OAuth callback error', { error });
        const clientKey = req.query.clientKey || 'reactory';
        res.redirect(`/auth/okta/failure?clientKey=${clientKey}`);
      }
    }
  );

  /**
   * Okta OAuth Failure Endpoint
   * Handles authentication failures
   */
  app.get(
    '/auth/okta/failure',
    async (req: any, res: Response) => {
      const clientKey = req.query.clientKey || 'reactory';
      const error = req.query.error || 'unknown';

      logger.warn('Okta authentication failed', {
        clientKey,
        error,
        query: req.query,
      });

      try {
        const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
        
        res.clearCookie('connect.sid');
        
        if (partner) {
          res.redirect(`${partner.siteUrl}/error?auth_token=&message=Could not login via Okta`);
        } else {
          res.status(401).send({
            error: 'Authentication with Okta failed',
            details: error,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error('Error in failure handler', { error });
        res.status(401).send({
          error: 'Authentication with Okta failed',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
};

export default OktaStrategy;

