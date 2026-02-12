/**
 * GitHub OAuth2 Authentication Strategy
 * 
 * Provides GitHub social login using OAuth2 flow.
 * Users can authenticate using their GitHub accounts.
 */

import { encoder } from '@reactory/server-core/utils';
import { Strategy as GitHubStrategy } from 'passport-github';
import Helpers, { OnDoneCallback } from '../helpers';
import { Application, Response } from 'express';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager, ErrorSanitizer, AuthAuditLogger } from '../security';
import AuthTelemetry from '../telemetry';

const {
  GITHUB_CLIENT_ID = 'GITHUB_CLIENT_ID',
  GITHUB_CLIENT_SECRET = 'GITHUB_CLIENT_SECRET',
  GITHUB_CLIENT_CALLBACK_URL = 'http://localhost:4000/auth/github/callback',
  GITHUB_OAUTH_SCOPE = 'user:email,read:user',
} = process.env;

/**
 * GitHub OAuth Strategy Configuration
 * Handles authentication via GitHub OAuth2
 */
const GitHubOAuthStrategy: passport.Strategy = new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: GITHUB_CLIENT_CALLBACK_URL,
  passReqToCallback: true,
  scope: GITHUB_OAUTH_SCOPE.split(','),
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
    logger.info('GitHub authentication attempt', {
      profileId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
    });

    const { context, session } = req;
    
    // Record OAuth callback received
    AuthTelemetry.recordOAuthCallback('github', clientKey);
    
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract user information from GitHub profile
    const email = profile.emails && profile.emails[0]?.value;
    const githubId = profile.id;
    const { username, displayName } = profile;
    const avatarUrl = profile.photos && profile.photos[0]?.value;

    if (!email) {
      const duration = (Date.now() - startTime) / 1000;
      logger.warn('GitHub profile missing email', { 
        profileId: profile.id,
        username: profile.username,
      });
      AuthAuditLogger.logFailure(profile.username || profile.id, 'github', 'No email in profile');
      AuthTelemetry.recordFailure('github', clientKey, 'no_email', duration);
      return done(new Error('GitHub profile does not include email. Please ensure your GitHub email is public or grant email access.'), false);
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
        AuthTelemetry.recordFailure('github', clientKey, 'missing_state', duration);
        return done(new Error('Invalid state'), false);
      }

      // @ts-ignore
      const stateData = StateManager.validateState(session.authState);
      if (!stateData) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Invalid or expired state');
        AuthTelemetry.recordFailure('github', clientKey, 'invalid_state', duration);
        AuthTelemetry.recordCSRFValidation('github', false);
        return done(new Error('Invalid state'), false);
      }
      
      // Validate CSRF state
      AuthTelemetry.recordCSRFValidation('github', true);

      clientKey = stateData['x-client-key'];
      const partner: Reactory.Models.IReactoryClientDocument = await ReactoryClient.findOne({
        key: clientKey
      }).exec() as Reactory.Models.IReactoryClientDocument;

      if (!partner) {
        const duration = (Date.now() - startTime) / 1000;
        logger.error('Client not found', { clientKey });
        AuthTelemetry.recordFailure('github', clientKey, 'client_not_found', duration);
        return done(new Error('Client not found'), false);
      }

      context.partner = partner;
    } else {
      clientKey = context.partner.key;
    }
    
    // Track attempt with actual client key
    AuthTelemetry.recordAttempt('github', clientKey);

    // Build authentication properties
    const authProps = {
      githubId,
      username,
      displayName,
      accessToken,
    };

    // Find or create user
    let user = await userService.findUserWithEmail(email);
    if (!user) {
      logger.info('Creating new user from GitHub profile', { email, username });
      
      // Parse name from displayName if available
      const nameParts = displayName ? displayName.split(' ') : [username];
      const firstName = nameParts[0] || username;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

      user = await userService.createUser({
        email,
        firstName,
        lastName,
      });
    }

    // Update avatar
    if (avatarUrl) {
      user.avatar = avatarUrl;
      user.avatarProvider = 'github';
    }

    // Update or create GitHub authentication record
    const githubAuth = user.authentications.find(auth => auth.provider === 'github');
    if (!githubAuth) {
      user.authentications.push({
        provider: 'github',
        lastLogin: new Date(),
        props: authProps,
      });
      logger.info('Added GitHub authentication for user', { 
        userId: user._id,
        email,
        username,
      });
    } else {
      githubAuth.lastLogin = new Date();
      githubAuth.props = authProps;
      logger.info('Updated GitHub authentication for user', { 
        userId: user._id,
        email,
        username,
      });
    }

    // Save user
    await user.save();

    // Log successful authentication
    AuthAuditLogger.logSuccess(user._id.toString(), 'github', {
      email: user.email,
      githubId,
      username,
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
    const loginToken = await Helpers.generateLoginToken(user);
    
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordSuccess('github', clientKey, duration, user._id.toString());
    
    logger.info('GitHub authentication successful', {
      userId: user._id,
      email: user.email,
      username,
    });

    return done(null, loginToken);

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    AuthTelemetry.recordFailure('github', clientKey, 'authentication_error', duration);
    logger.error('GitHub authentication error', { error });
    AuthAuditLogger.logFailure(
      profile?.username || profile?.id || 'unknown',
      'github',
      'Authentication error',
      { error: error.message }
    );
    const safeError = ErrorSanitizer.sanitizeError(error, { provider: 'github' });
    return done(new Error(safeError), false);
  }
});

/**
 * Configure GitHub OAuth Routes
 * Sets up the start, callback, and failure endpoints
 */
export const useGithubRoutes = (app: Application) => {
  /**
   * GitHub OAuth Start Endpoint
   * Initiates the GitHub OAuth flow
   */
  app.get(
    '/auth/github/start',
    (req: Reactory.Server.ReactoryExpressRequest, res: Response, next) => {
      try {
        // Create state for CSRF protection
        const state = StateManager.createState({
          'x-client-key': req.query['x-client-key'],
          'x-client-pwd': req.query['x-client-pwd'],
          flow: 'github',
        });

        // Store state in session
        // @ts-ignore
        req.session.authState = state;

        logger.debug('Starting GitHub OAuth flow', {
          clientKey: req.query['x-client-key'],
          state,
        });

        // Redirect to GitHub
        passport.authenticate('github', {
          scope: GITHUB_OAUTH_SCOPE.split(','),
          passReqToCallback: true,
          state,
        })(req, res, next);
      } catch (error) {
        logger.error('Error starting GitHub OAuth', { error });
        res.status(500).send({
          error: 'An error occurred while trying to authenticate with GitHub',
        });
      }
    }
  );

  /**
   * GitHub OAuth Failure Endpoint
   * Handles authentication failures
   */
  app.get('/auth/github/failure', (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
    logger.warn('GitHub authentication failed', {
      query: req.query,
      session: req.session?.id,
    });

    res.status(401).send({
      error: 'Authentication with GitHub failed',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GitHub OAuth Callback Endpoint
   * Handles the OAuth callback from GitHub
   */
  app.get(
    '/auth/github/callback',
    (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
      const { context } = req;
      const failureRedirectUrl = context.partner
        ? `${context.partner.siteUrl}/auth/github/failure`
        : '/auth/github/failure';

      const onCompletion = (err: string, user: {
        id: string;
        firstName: string;
        lastName: string;
        token: string;
      } | boolean) => {
        if (err) {
          logger.error('GitHub OAuth callback error', { error: err });
          res.status(500).send({
            error: 'An error occurred while trying to authenticate with GitHub',
            timestamp: new Date().toISOString(),
          });
        } else {
          if (!user) {
            logger.warn('GitHub authentication returned no user');
            res.status(302).redirect(failureRedirectUrl);
          } else {
            const successUrl = context.partner
              ? `${context.partner.siteUrl}?auth_token=${(user as { token: string }).token}`
              : `/?auth_token=${(user as { token: string }).token}`;

            logger.info('GitHub authentication complete, redirecting', {
              successUrl: successUrl.split('?')[0], // Log URL without token
            });

            res.status(302).redirect(successUrl);
          }
        }
      };

      // Authenticate with GitHub
      passport.authenticate('github', {
        failureRedirect: failureRedirectUrl,
        passReqToCallback: true,
        scope: GITHUB_OAUTH_SCOPE.split(','),
      }, onCompletion)(req, res);
    }
  );
};

export default GitHubOAuthStrategy;

