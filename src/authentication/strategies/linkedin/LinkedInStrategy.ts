/**
 * LinkedIn OAuth2 Authentication Strategy
 * 
 * Provides LinkedIn professional network login using OAuth2 flow.
 * Updated for LinkedIn API v2 with new OAuth scopes.
 */

import { encoder } from '@reactory/server-core/utils';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import Helpers, { OnDoneCallback } from '../helpers';
import { Application, Response } from 'express';
import passport from 'passport';
import logger from '@reactory/server-core/logging';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import { StateManager, ErrorSanitizer, AuthAuditLogger } from '../security';

const {
  LINKEDIN_CLIENT_ID = 'LINKEDIN_CLIENT_ID',
  LINKEDIN_CLIENT_SECRET = 'LINKEDIN_CLIENT_SECRET',
  LINKEDIN_CALLBACK_URL = 'http://localhost:4000/auth/linkedin/callback',
  // Updated for LinkedIn API v2: openid, profile, email (not r_emailaddress, r_liteprofile)
  LINKEDIN_OAUTH_SCOPE = 'openid,profile,email',
} = process.env;

/**
 * LinkedIn OAuth Strategy Configuration
 * Handles authentication via LinkedIn OAuth2 (API v2)
 */
const LinkedInOAuthStrategy: passport.Strategy = new LinkedInStrategy({
  clientID: LINKEDIN_CLIENT_ID,
  clientSecret: LINKEDIN_CLIENT_SECRET,
  callbackURL: LINKEDIN_CALLBACK_URL,
  scope: LINKEDIN_OAUTH_SCOPE.split(','),
  passReqToCallback: true,
}, async (
  req: Reactory.Server.ReactoryExpressRequest,
  accessToken: string,
  refreshToken: any,
  profile: any,
  done: OnDoneCallback
) => {
  try {
    logger.info('LinkedIn authentication attempt', {
      profileId: profile.id,
      displayName: profile.displayName,
    });

    const { context, session } = req;
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

    // Extract user information from LinkedIn profile (API v2 format)
    const email = profile.emails && profile.emails[0]?.value;
    const linkedinId = profile.id;
    const { name, displayName } = profile;
    const avatarUrl = profile.photos && profile.photos[0]?.value;

    if (!email) {
      logger.warn('LinkedIn profile missing email', { profileId: profile.id });
      AuthAuditLogger.logFailure(profile.id, 'linkedin', 'No email in profile');
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
        logger.error('Missing auth state in session');
        return done(new Error('Invalid state'), false);
      }

      // @ts-ignore
      const stateData = StateManager.validateState(session.authState);
      if (!stateData) {
        logger.error('Invalid or expired state');
        return done(new Error('Invalid state'), false);
      }

      const clientKey = stateData['x-client-key'];
      const partner: Reactory.Models.IReactoryClientDocument = await ReactoryClient.findOne({
        key: clientKey
      }).exec() as Reactory.Models.IReactoryClientDocument;

      if (!partner) {
        logger.error('Client not found', { clientKey });
        return done(new Error('Client not found'), false);
      }

      context.partner = partner;
    }

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

    // Generate login token
    const loginToken = await Helpers.generateLoginToken(user);
    
    logger.info('LinkedIn authentication successful', {
      userId: user._id,
      email: user.email,
    });

    return done(null, loginToken);

  } catch (error) {
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
});

/**
 * Configure LinkedIn OAuth Routes
 */
export const useLinkedInRoutes = (app: Application) => {
  app.get(
    '/auth/linkedin/start',
    (req: Reactory.Server.ReactoryExpressRequest, res: Response, next) => {
      try {
        const state = StateManager.createState({
          'x-client-key': req.query['x-client-key'],
          'x-client-pwd': req.query['x-client-pwd'],
          flow: 'linkedin',
        });

        // @ts-ignore
        req.session.authState = state;

        logger.debug('Starting LinkedIn OAuth flow', {
          clientKey: req.query['x-client-key'],
          state,
        });

        passport.authenticate('linkedin', {
          scope: LINKEDIN_OAUTH_SCOPE.split(','),
          passReqToCallback: true,
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

  app.get(
    '/auth/linkedin/callback',
    (req: Reactory.Server.ReactoryExpressRequest, res: Response) => {
      const { context } = req;
      const failureRedirectUrl = context.partner
        ? `${context.partner.siteUrl}/auth/linkedin/failure`
        : '/auth/linkedin/failure';

      const onCompletion = (err: string, user: {
        id: string;
        firstName: string;
        lastName: string;
        token: string;
      } | boolean) => {
        if (err) {
          logger.error('LinkedIn OAuth callback error', { error: err });
          res.status(500).send({
            error: 'An error occurred while trying to authenticate with LinkedIn',
            timestamp: new Date().toISOString(),
          });
        } else {
          if (!user) {
            logger.warn('LinkedIn authentication returned no user');
            res.status(302).redirect(failureRedirectUrl);
          } else {
            const successUrl = context.partner
              ? `${context.partner.siteUrl}?auth_token=${(user as { token: string }).token}`
              : `/?auth_token=${(user as { token: string }).token}`;

            logger.info('LinkedIn authentication complete, redirecting', {
              successUrl: successUrl.split('?')[0],
            });

            res.status(302).redirect(successUrl);
          }
        }
      };

      passport.authenticate('linkedin', {
        failureRedirect: failureRedirectUrl,
        passReqToCallback: true,
        scope: LINKEDIN_OAUTH_SCOPE.split(','),
      }, onCompletion)(req, res);
    }
  );
};

export default LinkedInOAuthStrategy;

