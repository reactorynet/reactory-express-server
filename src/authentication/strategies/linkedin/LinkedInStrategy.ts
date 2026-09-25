/**
 * LinkedIn OAuth2 Authentication Strategy
 * 
 * Provides LinkedIn professional network login using OAuth2 flow.
 * Updated for LinkedIn API v2 with new OAuth scopes.
 */

import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import Helpers, { OnDoneCallback } from '../helpers';
import { Application, NextFunction, Response } from 'express';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager, ErrorSanitizer, AuthAuditLogger } from '../security';
import AuthTelemetry from '../telemetry';
import { beginTenantOAuth, completeTenantOAuth, isCallbackFailure } from '../tenantOAuth';

const {
  LINKEDIN_CLIENT_ID = 'LINKEDIN_CLIENT_ID',
  LINKEDIN_CLIENT_SECRET = 'LINKEDIN_CLIENT_SECRET',
  LINKEDIN_CALLBACK_URL = 'http://localhost:4000/auth/linkedin/callback',
  // Updated for LinkedIn API v2: openid, profile, email (not r_emailaddress, r_liteprofile)
  LINKEDIN_OAUTH_SCOPE = 'openid,profile,email',
} = process.env;

/**
 * LinkedIn verify callback. The callback route resolves the tenant from the
 * validated CSRF state before passport calls this, so `context.partner` is
 * normally set; the session fallback below is kept for direct callers.
 */
export const linkedinVerifyCallback = async (
  req: Reactory.Server.ReactoryExpressRequest,
  accessToken: string,
  refreshToken: any,
  profile: any,
  done: OnDoneCallback
) => {
  const startTime = Date.now();
  let clientKey = 'api';
  
  try {
    logger.info('LinkedIn authentication attempt', {
      profileId: profile.id,
      displayName: profile.displayName,
    });

    const { context, session } = req;
    
    // Record OAuth callback received
    AuthTelemetry.recordOAuthCallback('linkedin', clientKey);
    
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract user information from LinkedIn profile (API v2 format)
    const email = profile.emails && profile.emails[0]?.value;
    const linkedinId = profile.id;
    const { name, displayName } = profile;
    const avatarUrl = profile.photos && profile.photos[0]?.value;

    if (!email) {
      const duration = (Date.now() - startTime) / 1000;
      logger.warn('LinkedIn profile missing email', { profileId: profile.id });
      AuthAuditLogger.logFailure(profile.id, 'linkedin', 'No email in profile');
      AuthTelemetry.recordFailure('linkedin', clientKey, 'no_email', duration);
      return done(new Error('LinkedIn profile does not include email'), false);
    }

    // Ensure system user is logged in
    if (!context.user) {
      context.user = await userService.findUserWithEmail(process.env.REACTORY_APPLICATION_EMAIL);
    }

    // Resolve partner/client from state
    if (!context.partner) {
      // @ts-ignore
      if (!session.authState) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Missing auth state in session');
        AuthTelemetry.recordFailure('linkedin', clientKey, 'missing_state', duration);
        return done(new Error('Invalid state'), false);
      }

      // @ts-ignore
      const stateData = StateManager.validateState(session.authState);
      if (!stateData) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Invalid or expired state');
        AuthTelemetry.recordFailure('linkedin', clientKey, 'invalid_state', duration);
        AuthTelemetry.recordCSRFValidation('linkedin', false);
        return done(new Error('Invalid state'), false);
      }
      
      // Validate CSRF state
      AuthTelemetry.recordCSRFValidation('linkedin', true);

      clientKey = stateData['x-client-key'];
      const partner: Reactory.Models.IReactoryClientDocument = await ReactoryClient.findOne({
        key: clientKey
      }).exec() as Reactory.Models.IReactoryClientDocument;

      if (!partner) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Client not found', { clientKey });
        AuthTelemetry.recordFailure('linkedin', clientKey, 'client_not_found', duration);
        return done(new Error('Client not found'), false);
      }

      context.partner = partner;
    } else {
      clientKey = context.partner.key;
    }
    
    // Track attempt with actual client key
    AuthTelemetry.recordAttempt('linkedin', clientKey);

    // Build authentication properties
    const authProps = {
      linkedinId,
      displayName,
      accessToken,
    };

    // Find or create user
    let user = await userService.findUserWithEmail(email);
    if (!user) {
      logger.info('Creating new user from LinkedIn profile', { email });
      user = await userService.createUser({
        email,
        firstName: name?.givenName || displayName?.split(' ')[0] || 'LinkedIn',
        lastName: name?.familyName || displayName?.split(' ').slice(1).join(' ') || 'User',
      });
    }

    // Update avatar
    if (avatarUrl) {
      user.avatar = avatarUrl;
      user.avatarProvider = 'linkedin';
    }

    // Update or create LinkedIn authentication record
    const linkedinAuth = user.authentications.find(auth => auth.provider === 'linkedin');
    if (!linkedinAuth) {
      user.authentications.push({
        provider: 'linkedin',
        lastLogin: new Date(),
        props: authProps,
      });
      logger.info('Added LinkedIn authentication for user', { userId: user._id, email });
    } else {
      linkedinAuth.lastLogin = new Date();
      linkedinAuth.props = authProps;
      logger.info('Updated LinkedIn authentication for user', { userId: user._id, email });
    }

    // Save user
    await user.save();

    // Log successful authentication
    AuthAuditLogger.logSuccess(user._id.toString(), 'linkedin', {
      email: user.email,
      linkedinId,
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
    AuthTelemetry.recordSuccess('linkedin', clientKey, duration, user._id.toString());
    
    logger.info('LinkedIn authentication successful', {
      userId: user._id,
      email: user.email,
    });

    return done(null, loginToken);

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('linkedin', clientKey, 'authentication_error', duration);
    logger.error('LinkedIn authentication error', { error });
    AuthAuditLogger.logFailure(
      profile?.id || 'unknown',
      'linkedin',
      'Authentication error',
      { error: error.message }
    );
    const safeError = ErrorSanitizer.sanitizeError(error, { provider: 'linkedin' });
    return done(new Error(safeError), false);
  }
};

const LinkedInOAuthStrategy: passport.Strategy = new LinkedInStrategy({
  clientID: LINKEDIN_CLIENT_ID,
  clientSecret: LINKEDIN_CLIENT_SECRET,
  callbackURL: LINKEDIN_CALLBACK_URL,
  scope: LINKEDIN_OAUTH_SCOPE.split(','),
  passReqToCallback: true,
}, linkedinVerifyCallback);

/**
 * Configure LinkedIn OAuth Routes
 */
export const useLinkedInRoutes = (app: Application) => {
  /**
   * LinkedIn OAuth Start Endpoint
   * Resolves the tenant from `?x-client-key=`, mints a session-bound CSRF
   * state and redirects to LinkedIn with the tenant's strategy.
   */
  app.get(
    '/auth/linkedin/start',
    async (req: Reactory.Server.ReactoryExpressRequest, res: Response, next: NextFunction) => {
      try {
        const begun = await beginTenantOAuth(req, res, 'linkedin');
        if (!begun) return;
        const { clientKey, strategyName, state } = begun;

        logger.debug('Starting LinkedIn OAuth flow', { clientKey, strategyName });

        passport.authenticate(strategyName, {
          scope: LINKEDIN_OAUTH_SCOPE.split(','),
          state,
        })(req, res, next);
      } catch (error) {
        logger.error('Error starting LinkedIn OAuth', { error });
        res.status(500).send({
          error: 'An error occurred while trying to authenticate with LinkedIn',
        });
      }
    }
  );

  /**
   * LinkedIn OAuth Failure Endpoint
   * Handles authentication failures
   */
  app.get('/auth/linkedin/failure', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
    logger.warn('LinkedIn authentication failed', {
      query: req.query,
      session: req.session?.id,
    });

    res.status(401).send({
      error: 'Authentication with LinkedIn failed',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * LinkedIn OAuth Callback Endpoint
   * Validates the CSRF state against the session, resolves the tenant named
   * in it, then completes the exchange with that tenant's strategy.
   */
  app.get(
    '/auth/linkedin/callback',
    async (req: Reactory.Server.ReactoryExpressRequest, res: Response, next: NextFunction) => {
      try {
        const resolved = await completeTenantOAuth(req, 'linkedin');
        if (isCallbackFailure(resolved)) {
          AuthTelemetry.recordCSRFValidation('linkedin', false);
          return res.status(resolved.status).send({
            error: 'Authentication with LinkedIn failed',
            reason: resolved.error,
            timestamp: new Date().toISOString(),
          });
        }
        AuthTelemetry.recordCSRFValidation('linkedin', true);

        const { partner, strategyName } = resolved;
        const failureRedirectUrl = `${partner.siteUrl}/auth/linkedin/failure`;

        const onCompletion = (err: any, user: { token: string } | false) => {
          if (err) {
            logger.error('LinkedIn OAuth callback error', { error: err });
            res.status(500).send({
              error: 'An error occurred while trying to authenticate with LinkedIn',
              timestamp: new Date().toISOString(),
            });
          } else if (!user) {
            logger.warn('LinkedIn authentication returned no user');
            res.status(302).redirect(failureRedirectUrl);
          } else {
            logger.info('LinkedIn authentication complete, redirecting', {
              successUrl: partner.siteUrl,
            });
            res.status(302).redirect(`${partner.siteUrl}?auth_token=${user.token}`);
          }
        };

        passport.authenticate(strategyName, {
          failureRedirect: failureRedirectUrl,
          scope: LINKEDIN_OAUTH_SCOPE.split(','),
        }, onCompletion)(req, res, next);
      } catch (error) {
        logger.error('LinkedIn OAuth callback error', { error });
        res.status(500).send({
          error: 'An error occurred while trying to authenticate with LinkedIn',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
};

export default LinkedInOAuthStrategy;

