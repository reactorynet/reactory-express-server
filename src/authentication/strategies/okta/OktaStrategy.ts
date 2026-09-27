/**
 * Okta Authentication Strategy
 * 
 * Provides Okta SSO authentication using OIDC (OpenID Connect).
 * Okta is an enterprise identity and access management platform.
 */

import { Strategy as OktaOAuthStrategy } from 'passport-okta-oauth20';
import passport from 'passport';
import { Application, NextFunction, Response } from 'express';
import Helpers, { OnDoneCallback } from '../helpers';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { ErrorSanitizer, AuthAuditLogger, VerifiedStateStore } from '../security';
import AuthTelemetry from '../telemetry';
import { beginTenantOAuth, completeTenantOAuth, isCallbackFailure } from '../tenantOAuth';

const {
  OKTA_CLIENT_ID = 'OKTA_CLIENT_ID',
  OKTA_CLIENT_SECRET = 'OKTA_CLIENT_SECRET',
  OKTA_DOMAIN = 'your-domain.okta.com', // e.g., dev-123456.okta.com
  OKTA_ISSUER, // Optional: defaults to https://{OKTA_DOMAIN}/oauth2/default
  OKTA_CALLBACK_URL = 'http://localhost:4000/auth/okta/callback',
} = process.env;

// Construct issuer URL
const issuerUrl = OKTA_ISSUER || `https://${OKTA_DOMAIN}/oauth2/default`;

/**
 * Okta OAuth 2.0 Strategy Configuration
 */
export const oktaVerifyCallback = async (
  req: any,
  accessToken: string,
  refreshToken: string,
  params: any,
  profile: any,
  done: OnDoneCallback
) => {
  const startTime = Date.now();
  let clientKey = 'api';
  
  try {
    logger.info('Okta authentication attempt', {
      sub: profile.id,
      displayName: profile.displayName,
      issuer: issuerUrl,
    });

    const { context } = req;
    
    // Record OAuth callback received
    AuthTelemetry.recordOAuthCallback('okta', clientKey);
    
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract email from profile
    const email = profile.emails?.[0]?.value || 
                  profile._json?.email || 
                  profile._json?.preferred_username;
    
    const oktaId = profile.id; // Okta user ID (sub)
    const displayName = profile.displayName || profile._json?.name;

    if (!email) {
      const duration = (Date.now() - startTime) / 1000;
      logger.warn('Okta profile missing email', { sub: profile.id });
      AuthAuditLogger.logFailure(profile.id, 'okta', 'No email in profile');
      AuthTelemetry.recordFailure('okta', clientKey, 'no_email', duration);
      return done(new Error('Okta profile does not include email'), false);
    }

    // Ensure system user is logged in
    if (!context.user) {
      context.user = await userService.findUserWithEmail(process.env.REACTORY_APPLICATION_EMAIL);
    }

    // Partner should be set from route param
    if (!context.partner) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Missing partner in context');
      AuthTelemetry.recordFailure('okta', clientKey, 'client_not_found', duration);
      return done(new Error('Client not found'), false);
    }
    
    clientKey = context.partner.key;
    
    // Track attempt with actual client key
    AuthTelemetry.recordAttempt('okta', clientKey);

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

    // Generate login token
    const loginToken = await Helpers.generateLoginToken(user, req.ip, clientKey, req.context);
    
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordSuccess('okta', clientKey, duration, user._id.toString());
    
    logger.info('Okta authentication successful', {
      userId: user._id,
      email: user.email,
      oktaId,
    });

    return done(null, loginToken);

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('okta', clientKey, 'authentication_error', duration);
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
};

/**
 * Okta OAuth 2.0 Strategy Configuration
 */
const OktaStrategy = new OktaOAuthStrategy({
  audience: `https://${OKTA_DOMAIN}`,
  clientID: OKTA_CLIENT_ID,
  clientSecret: OKTA_CLIENT_SECRET,
  callbackURL: OKTA_CALLBACK_URL,
  scope: ['openid', 'profile', 'email'],
  passReqToCallback: true,
  // State is minted and verified by the tenant OAuth routes; see VerifiedStateStore.
  store: new VerifiedStateStore(),
} as any, oktaVerifyCallback);

/**
 * Configure Okta OAuth Routes
 * Handles the authorization-code flow with Okta, per tenant.
 */
export const useOktaRoutes = (app: Application) => {
  /**
   * Okta Start Endpoint
   * Initiates the Okta authentication flow for the tenant named by
   * `:clientKey` (or `?x-client-key=` as sent by the login buttons).
   */
  const start = async (req: any, res: Response, next: NextFunction) => {
    try {
      const begun = await beginTenantOAuth(req, res, 'okta');
      if (!begun) return;
      const { clientKey, strategyName, state } = begun;

      logger.debug('Starting Okta OAuth flow', { clientKey, strategyName });

      passport.authenticate(strategyName, {
        state,
        failureRedirect: `/auth/okta/failure?clientKey=${encodeURIComponent(clientKey)}`,
      })(req, res, next);
    } catch (error) {
      logger.error('Error starting Okta OAuth', { error });
      res.status(500).send({
        error: 'An error occurred while trying to authenticate with Okta',
      });
    }
  };

  app.get('/auth/okta/start/:clientKey', start);
  app.get('/auth/okta/start', start);

  /**
   * Okta Callback Endpoint
   * Handles the callback from Okta
   */
  app.get(
    '/auth/okta/callback',
    async (req: any, res: Response, next: NextFunction) => {
      try {
        const resolved = await completeTenantOAuth(req, 'okta');
        if (isCallbackFailure(resolved)) {
          return res.redirect(`/auth/okta/failure?error=${resolved.error}`);
        }

        const { clientKey, partner, strategyName } = resolved;
        const failureRedirect = `/auth/okta/failure?clientKey=${encodeURIComponent(clientKey)}`;

        logger.debug('Okta OAuth callback received', { clientKey, strategyName });

        passport.authenticate(strategyName, { failureRedirect }, (err: any, user: any) => {
          if (err) {
            logger.error('Okta authentication error in callback', { error: err });
            return res.redirect(failureRedirect);
          }

          if (!user) {
            logger.warn('Okta authentication returned no user');
            return res.redirect(failureRedirect);
          }

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
        res.redirect('/auth/okta/failure?error=callback_error');
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

