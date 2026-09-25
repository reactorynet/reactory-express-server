/**
 * Microsoft Azure AD Authentication Strategy
 * 
 * Provides Microsoft/Azure AD enterprise login using OIDC (OpenID Connect).
 * Supports both single-tenant and multi-tenant Azure AD applications.
 */

import { OIDCStrategy } from 'passport-azure-ad';
import passport from 'passport';
import { Application, NextFunction, Response } from 'express';
import Helpers, { OnDoneCallback } from '../helpers';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { ErrorSanitizer, AuthAuditLogger } from '../security';
import AuthTelemetry from '../telemetry';
import TenantStrategyRegistry from '../TenantStrategyRegistry';
import { startClientKey } from '../tenantOAuth';

const MICROSOFT_SESSION_CLIENT_KEY = 'microsoftAuthClientKey';

const { 
  MICROSOFT_OAUTH_REDIRECT_URI = 'https://localhost:4000/auth/microsoft/openid/complete/',
} = process.env;

const {
  MICROSOFT_CLIENT_ID = 'MICROSOFT_CLIENT_ID',
  MICROSOFT_CLIENT_SECRET = 'MICROSOFT_CLIENT_SECRET',
  MICROSOFT_TENANT_ID = 'common', // 'common' for multi-tenant, specific ID for single-tenant
  OAUTH_REDIRECT_URI = MICROSOFT_OAUTH_REDIRECT_URI || 'http://localhost:4000/auth/microsoft/openid/complete/',
  // Distinct from NODE_ENV on purpose: NODE_ENV elsewhere in this codebase
  // means "am I running the compiled build" (src/ vs app/), not "is this a
  // real internet-facing deployment with TLS" — conflating the two here
  // would force every non-dev deployment (including internal/test podman
  // deployments using a plain-HTTP redirect) to also be a real HTTPS one.
  MICROSOFT_OAUTH_ALLOW_HTTP_REDIRECT,
} = process.env;

const MULTI_TENANT_AUTHORITIES = ['common', 'organizations', 'consumers'];
const warnedAuthorities = new Set<string>();

/**
 * Issuer validation options for an Azure AD tenant id.
 *
 * A specific tenant id validates the token issuer against
 * `https://login.microsoftonline.com/<tenantId>/v2.0`. The multi-tenant
 * authorities (`common`, `organizations`, `consumers`) have no single issuer,
 * so validation stays off for them and a warning is logged once per authority.
 */
export const microsoftIssuerOptions = (tenantId: string = 'common'): { validateIssuer: boolean; issuer?: string } => {
  if (MULTI_TENANT_AUTHORITIES.includes(tenantId.toLowerCase())) {
    if (!warnedAuthorities.has(tenantId)) {
      warnedAuthorities.add(tenantId);
      logger.warn(
        `Microsoft OIDC is configured for the multi-tenant authority "${tenantId}"; issuer validation is disabled. ` +
        'Set MICROSOFT_TENANT_ID (or the tenant auth_config tenantId) to a specific Azure AD tenant for production.'
      );
    }
    return { validateIssuer: false };
  }
  return {
    validateIssuer: true,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  };
};

/**
 * Path the Azure AD redirect is served on. OAUTH_REDIRECT_URI is a full URL
 * (it is what Azure redirects the browser to); Express needs its pathname.
 */
export const microsoftCallbackPath = (redirectUri: string = OAUTH_REDIRECT_URI): string => {
  let path: string;
  try {
    path = new URL(redirectUri).pathname;
  } catch {
    path = redirectUri;
  }
  return path.endsWith('/') ? path : `${path}/`;
};

/**
 * Microsoft verify callback. Routes set `context.partner` before passport
 * calls this.
 */
export const microsoftVerifyCallback = async (
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
};

/**
 * Microsoft Azure AD OIDC Strategy Configuration (env-backed default)
 */
const MicrosoftOIDCStrategy = new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: MICROSOFT_CLIENT_ID,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: OAUTH_REDIRECT_URI,
  allowHttpForRedirectUrl: MICROSOFT_OAUTH_ALLOW_HTTP_REDIRECT === 'true' || OAUTH_REDIRECT_URI.startsWith('http://'),
  clientSecret: MICROSOFT_CLIENT_SECRET,
  ...microsoftIssuerOptions(MICROSOFT_TENANT_ID),
  passReqToCallback: true,
  scope: ['openid', 'profile', 'email'],
}, microsoftVerifyCallback);

/**
 * Configure Microsoft OAuth Routes
 * Handles OIDC flow with Azure AD, per tenant.
 *
 * passport-azure-ad manages its own state and nonce in the session, so the
 * tenant is carried in the redirect path (`<callback path>/:clientKey`) or,
 * when the registered redirect URI has no key segment, in the session.
 */
export const useMicrosoftRoutes = (app: Application) => {
  const start = async (req: any, res: Response, next: NextFunction) => {
    try {
      const clientKey = startClientKey(req);
      if (!clientKey) {
        return res.status(400).send({ error: 'Missing client key' });
      }

      const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
      if (!partner) {
        logger.error('Client not found', { clientKey });
        return res.status(404).send({ error: 'Client not found' });
      }

      req.partner = partner;
      req.context.partner = partner;

      if (!TenantStrategyRegistry.isProviderEnabled('microsoft', partner)) {
        return res.status(404).send({ error: 'Microsoft authentication is disabled for this tenant' });
      }

      const strategyName = TenantStrategyRegistry.getStrategyName('microsoft', partner);
      if (!strategyName) {
        return res.status(503).send({ error: 'Microsoft authentication is not configured correctly for this tenant' });
      }

      if (req.session) {
        req.session[MICROSOFT_SESSION_CLIENT_KEY] = clientKey;
      }

      logger.debug('Starting Microsoft OAuth flow', { clientKey, strategyName });

      passport.authenticate(strategyName, {
        prompt: 'login',
        failureRedirect: `/auth/microsoft/openid/failure?x-client-key=${encodeURIComponent(clientKey)}`,
        failureFlash: false,
      })(req, res, next);
    } catch (error) {
      logger.error('Error starting Microsoft OAuth', { error });
      res.status(500).send({
        error: 'An error occurred while trying to authenticate with Microsoft',
      });
    }
  };

  app.get('/auth/microsoft/openid/start/:clientKey', start);
  app.get('/auth/microsoft/start', start);

  const callback = async (req: any, res: Response, next: NextFunction) => {
    const clientKey: string | undefined = req.params.clientKey || req.session?.[MICROSOFT_SESSION_CLIENT_KEY];
    const failureRedirect = `/auth/microsoft/openid/failure?x-client-key=${encodeURIComponent(clientKey || '')}`;
    try {
      if (!clientKey) {
        logger.warn('Microsoft callback without a tenant key');
        return res.redirect(failureRedirect);
      }

      const partner = await ReactoryClient.findOne({ key: clientKey }).exec();
      if (!partner) {
        logger.error('Client not found in callback', { clientKey });
        return res.redirect(failureRedirect);
      }

      req.partner = partner;
      req.context.partner = partner;

      const strategyName = TenantStrategyRegistry.isProviderEnabled('microsoft', partner)
        ? TenantStrategyRegistry.getStrategyName('microsoft', partner)
        : null;
      if (!strategyName) {
        return res.redirect(failureRedirect);
      }

      logger.debug('Microsoft OAuth callback received', { clientKey, strategyName });

      passport.authenticate(strategyName, {
        failureRedirect,
        failureFlash: false,
      }, (err: any, user: any) => {
        if (req.session) delete req.session[MICROSOFT_SESSION_CLIENT_KEY];

        if (err) {
          logger.error('Microsoft authentication error in callback', { error: err });
          return res.redirect(failureRedirect);
        }

        if (!user) {
          logger.warn('Microsoft authentication returned no user');
          return res.redirect(failureRedirect);
        }

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
      res.redirect(failureRedirect);
    }
  };

  const callbackPath = microsoftCallbackPath();
  app.post(`${callbackPath}:clientKey`, callback);
  app.post(callbackPath, callback);

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

