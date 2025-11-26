/**
 * Microsoft Azure AD Authentication Strategy
 * 
 * Provides Microsoft/Azure AD enterprise login using OIDC (OpenID Connect).
 * Supports both single-tenant and multi-tenant Azure AD applications.
 */

import { OIDCStrategy } from 'passport-azure-ad';
import passport from 'passport';
import { Application, Response } from 'express';
import Helpers, { OnDoneCallback } from '../helpers';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager, ErrorSanitizer, AuthAuditLogger } from '../security';
import AuthTelemetry from '../telemetry';

const {
  MICROSOFT_CLIENT_ID = 'MICROSOFT_CLIENT_ID',
  MICROSOFT_CLIENT_SECRET = 'MICROSOFT_CLIENT_SECRET',
  MICROSOFT_TENANT_ID = 'common', // 'common' for multi-tenant, specific ID for single-tenant
  OAUTH_REDIRECT_URI = 'http://localhost:4000/auth/microsoft/openid/complete/',
} = process.env;

/**
 * Microsoft Azure AD OIDC Strategy Configuration
 * Handles authentication via Azure AD OpenID Connect
 */
const MicrosoftOIDCStrategy = new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: MICROSOFT_CLIENT_ID,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: OAUTH_REDIRECT_URI,
  allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production', // Only allow HTTP in dev
  clientSecret: MICROSOFT_CLIENT_SECRET,
  validateIssuer: false, // Set to true for production with specific tenant
  passReqToCallback: true,
  scope: ['openid', 'profile', 'email'],
}, async (
  req: any,
  iss: string,
  sub: string,
  profile: any,
  jwtClaims: any,
  access_token: string,
  refresh_token: string,
  params: any,
  done: OnDoneCallback
) => {
  const startTime = Date.now();
  let clientKey = 'api';
  
  try {
    logger.info('Microsoft authentication attempt', {
      oid: profile.oid,
      displayName: profile.displayName,
      tenant: MICROSOFT_TENANT_ID,
    });

    const { context } = req;
    
    // Record OAuth callback received
    AuthTelemetry.recordOAuthCallback('microsoft', clientKey);
    
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract email from profile or claims
    const email = profile._json?.email || 
                  profile._json?.preferred_username || 
                  jwtClaims?.email || 
                  jwtClaims?.preferred_username;
    
    const microsoftId = profile.oid;
    const displayName = profile.displayName || profile._json?.name;

    if (!email) {
      const duration = (Date.now() - startTime) / 1000;
      logger.warn('Microsoft profile missing email', { oid: profile.oid });
      AuthAuditLogger.logFailure(profile.oid, 'microsoft', 'No email in profile');
      AuthTelemetry.recordFailure('microsoft', clientKey, 'no_email', duration);
      return done(new Error('Microsoft profile does not include email'), false);
    }

    // Ensure system user is logged in
    if (!context.user) {
      context.user = await userService.findUserWithEmail(process.env.REACTORY_APPLICATION_EMAIL);
    }

    // Partner should be set from route param
    if (!context.partner) {
      const duration = (Date.now() - startTime) / 1000;
      logger.error('Missing partner in context');
      AuthTelemetry.recordFailure('microsoft', clientKey, 'client_not_found', duration);
      return done(new Error('Client not found'), false);
    }
    
    clientKey = context.partner.key;
    
    // Track attempt with actual client key
    AuthTelemetry.recordAttempt('microsoft', clientKey);

    // Build authentication properties
    const authProps = {
      microsoftId,
      oid: profile.oid,
      displayName,
      tenantId: profile._json?.tid || jwtClaims?.tid,
      access_token,
    };

    // Find or create user
    let user = await userService.findUserWithEmail(email);
    if (!user) {
      logger.info('Creating new user from Microsoft profile', { email });
      
      // Parse name from displayName or claims
      const nameParts = displayName ? displayName.split(' ') : [];
      const firstName = profile._json?.given_name || nameParts[0] || 'Microsoft';
      const lastName = profile._json?.family_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User');

      user = await userService.createUser({
        email,
        firstName,
        lastName,
      });
    }

    // Update or create Microsoft authentication record
    const microsoftAuth = user.authentications.find(auth => auth.provider === 'microsoft');
    if (!microsoftAuth) {
      user.authentications.push({
        provider: 'microsoft',
        lastLogin: new Date(),
        props: authProps,
      });
      logger.info('Added Microsoft authentication for user', { 
        userId: user._id,
        email,
        oid: profile.oid,
      });
    } else {
      microsoftAuth.lastLogin = new Date();
      microsoftAuth.props = authProps;
      logger.info('Updated Microsoft authentication for user', { 
        userId: user._id,
        email,
        oid: profile.oid,
      });
    }

    // Save user
    await user.save();

    // Log successful authentication
    AuthAuditLogger.logSuccess(user._id.toString(), 'microsoft', {
      email: user.email,
      microsoftId,
      oid: profile.oid,
      tenant: MICROSOFT_TENANT_ID,
    });

    // Generate login token
    const loginToken = await Helpers.generateLoginToken(user);
    
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordSuccess('microsoft', clientKey, duration, user._id.toString());
    
    logger.info('Microsoft authentication successful', {
      userId: user._id,
      email: user.email,
      oid: profile.oid,
    });

    return done(null, loginToken);

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('microsoft', clientKey, 'authentication_error', duration);
    logger.error('Microsoft authentication error', { error });
    AuthAuditLogger.logFailure(
      profile?.oid || 'unknown',
      'microsoft',
      'Authentication error',
      { error: error.message }
    );
    const safeError = ErrorSanitizer.sanitizeError(error, { provider: 'microsoft' });
    return done(new Error(safeError), false);
  }
});

/**
 * Configure Microsoft OAuth Routes
 * Handles OIDC flow with Azure AD
 */
export const useMicrosoftRoutes = (app: Application) => {
  /**
   * Microsoft OIDC Start Endpoint
   * Initiates the Microsoft/Azure AD authentication flow
   */
  app.get(
    '/auth/microsoft/openid/start/:clientKey',
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

        logger.debug('Starting Microsoft OAuth flow', {
          clientKey,
          tenant: MICROSOFT_TENANT_ID,
        });

        // Authenticate with Azure AD
        passport.authenticate('azuread-openidconnect', {
          prompt: 'login',
          failureRedirect: `/auth/microsoft/openid/failure/${clientKey}`,
          failureFlash: false,
        })(req, res, next);
      } catch (error) {
        logger.error('Error starting Microsoft OAuth', { error });
        res.status(500).send({
          error: 'An error occurred while trying to authenticate with Microsoft',
        });
      }
    }
  );

  /**
   * Microsoft OIDC Callback Endpoint
   * Handles the callback from Azure AD
   */
  app.post(
    `${OAUTH_REDIRECT_URI}:clientKey`,
    async (req: any, res: Response, next) => {
      try {
        const { clientKey } = req.params;

        logger.debug('Microsoft OAuth callback received', { clientKey });

        // Resolve partner/client
        const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
        if (!partner) {
          logger.error('Client not found in callback', { clientKey });
          return res.redirect(`/auth/microsoft/openid/failure?x-client-key=${clientKey}`);
        }

        req.partner = partner;
        req.context.partner = partner;

        // Authenticate and handle response
        passport.authenticate('azuread-openidconnect', {
          failureRedirect: `/auth/microsoft/openid/failure?x-client-key=${clientKey}`,
          failureFlash: false,
        }, (err: any, user: any) => {
          if (err) {
            logger.error('Microsoft authentication error in callback', { error: err });
            return res.redirect(`/auth/microsoft/openid/failure?x-client-key=${clientKey}`);
          }

          if (!user) {
            logger.warn('Microsoft authentication returned no user');
            return res.redirect(`/auth/microsoft/openid/failure?x-client-key=${clientKey}`);
          }

          // Generate JWT token
          const token = typeof user === 'object' && 'token' in user 
            ? user.token 
            : Helpers.jwtMake(Helpers.jwtTokenForUser(user));

          logger.info('Microsoft authentication complete, redirecting', {
            clientKey,
            partnerId: partner._id,
          });

          res.clearCookie('connect.sid');
          res.redirect(`${partner.siteUrl}/?auth_token=${token}`);
        })(req, res, next);
      } catch (error) {
        logger.error('Microsoft OAuth callback error', { error });
        res.redirect(`/auth/microsoft/openid/failure?x-client-key=${req.params.clientKey}`);
      }
    }
  );

  /**
   * Microsoft OAuth Failure Endpoint
   * Handles authentication failures
   */
  app.get(
    '/auth/microsoft/openid/failure',
    async (req: any, res: Response) => {
      const clientKey = req.query['x-client-key'] || req.params.clientKey;

      logger.warn('Microsoft authentication failed', {
        clientKey,
        query: req.query,
      });

      try {
        const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
        
        res.clearCookie('connect.sid');
        
        if (partner) {
          res.redirect(`${partner.siteUrl}/error?auth_token=&message=Could not login via Microsoft`);
        } else {
          res.status(401).send({
            error: 'Authentication with Microsoft failed',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error('Error in failure handler', { error });
        res.status(401).send({
          error: 'Authentication with Microsoft failed',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
};

export default MicrosoftOIDCStrategy;

