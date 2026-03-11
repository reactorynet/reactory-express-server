import express from 'express';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import logger from '@reactory/server-core/logging';
import ApiError, { UserExistsError, UserValidationError } from '@reactory/server-core/exceptions';
import {
  ISendPayload,
} from '@reactory/server-modules/reactory-communicator/services/interfaces/ICommunicatorService';
import { Channel, Priority } from '@reactory/server-modules/reactory-communicator/types/message';
import moment from 'moment';

const router: express.IRouter = express.Router({
  caseSensitive: true,
  mergeParams: false,
  strict: false,
});

// Async error-handling wrapper — mirrors the pattern used in Workflow.ts
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * OPTIONS /register
 * CORS pre-flight acknowledgement for unauthenticated clients.
 */
router.options('/register', (_req, res) => {
  res.status(203).send('');
});

/**
 * POST /register
 * Self-registration endpoint. Creates the user and org (if new), returns a JWT.
 *
 * Body: { user: IUserCreateParams, organization: { name?: string, id?: string } }
 */
router.post(
  '/register',
  asyncHandler(async (req: any, res: any) => {
    const { user: userInput, organization: organizationInput } = req.body || {};

    if (!userInput) {
      return res.status(400).json({ error: 'Validation failed', message: '`user` is required in request body' });
    }
    if (!userInput.email) {
      return res.status(400).json({ error: 'Validation failed', message: '`user.email` is required' });
    }
    if (!userInput.password) {
      return res.status(400).json({ error: 'Validation failed', message: '`user.password` is required' });
    }

    const partner = req.partner || req.context?.partner;
    if (!partner) {
      return res.status(400).json({ error: 'Bad request', message: 'Could not determine client partner for this request' });
    }

    // selfRegister is defined on the implementation but may not yet exist in the installed
    // reactory-core type package — cast to any to access it safely at runtime.
    const userService = req.context.getService('core.UserService@1.0.0') as any;

    try {
      const { user: createdUser } = await userService.selfRegister(
        userInput,
        organizationInput || {},
        partner,
      );

      const token = Helpers.jwtMake(Helpers.jwtTokenForUser(createdUser));

      return res.status(200).json({
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        token,
      });
    } catch (err: any) {
      logger.error('Error occurred registering user', err);

      if (err instanceof UserValidationError) {
        return res.status(400).json(err);
      }
      if (err instanceof UserExistsError) {
        return res.status(409).json(err);
      }

      return res.status(500).json(new ApiError(err.message));
    }
  }),
);

/**
 * POST /forgot
 * Triggers a password-reset email for the given email address.
 *
 * Body: { email: string }
 */
router.post(
  '/forgot',
  asyncHandler(async (req: any, res: any) => {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({ error: 'Validation failed', message: '`email` is required' });
    }

    const partner = req.partner || req.context?.partner;
    if (!partner) {
      return res.status(400).json({ error: 'Bad request', message: 'Could not determine client partner for this request' });
    }

    const userService = req.context.getService('core.UserService@1.0.0') as Reactory.Service.IReactoryUserService;

    const user = await userService.findUserWithEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: `Could not find a user with email ${email}`,
      });
    }

    // Build a short-lived reset token (1 hour)
    const resetToken = Helpers.jwtMake(
      Helpers.jwtTokenForUser(user, { exp: moment().add(1, 'h').valueOf() }),
    );
    const resetLink = `${partner.siteUrl}${partner.resetEmailRoute}?auth_token=${resetToken}`;

    try {
      const communicatorService = req.context.getService('communicator.CommunicatorService@1.0.0') as any;

      const payload: ISendPayload = {
        partnerId: partner._id?.toString() ?? '',
        userId: user._id?.toString() ?? '',
        channel: Channel.EMAIL,
        to: user.email ?? '',
        subject: `Password reset for ${partner.name}`,
        templateId: 'forgot-password',
        templateData: {
          user,
          partner,
          applicationTitle: partner.name,
          resetLink,
        },
        priority: Priority.HIGH,
      };

      await communicatorService.send(payload);
    } catch (sendError: any) {
      logger.error('Failed to send forgot-password email via CommunicatorService', sendError);
      return res.status(500).json({ error: 'Failed to send reset email', message: sendError.message });
    }

    return res.status(200).json({ message: `A reset email has been sent to ${email}` });
  }),
);

/**
 * GET /checkUsername/:username
 * Public endpoint — checks whether a username is already in use.
 *
 * 200 { exists: false, username }
 * 409 { exists: true, suggestion, count }
 * 400 if username is too short or invalid
 */
router.get(
  '/checkUsername/:username',
  asyncHandler(async (req: any, res: any) => {
    const { username } = req.params;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username must be at least 3 characters',
      });
    }

    // Basic format guard — matches the User model validator
    if (!/^[a-z0-9_]{3,50}$/i.test(username.trim())) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username may only contain letters, numbers and underscores (3–50 characters)',
      });
    }

    const userService = req.context.getService('core.UserService@1.0.0') as any;
    const result = await userService.checkUsernameExists(username.trim());

    if (result.exists) {
      return res.status(409).json({
        error: 'Username taken',
        message: `The username “${username}” is already in use.`,
        exists: true,
        count: result.count,
        suggestion: result.suggestion,
      });
    }

    return res.status(200).json({
      exists: false,
      count: result.count,
      username: username.trim().toLowerCase(),
    });
  }),
);

export default router;

