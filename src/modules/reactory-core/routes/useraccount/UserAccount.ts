import express from 'express';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import logger from '@reactory/server-core/logging';
import ApiError, { UserExistsError, UserValidationError } from '@reactory/server-core/exceptions';
import {
  ISendPayload,
} from '@reactory/server-modules/reactory-communicator/services/interfaces/ICommunicatorService';
import { Channel, Priority } from '@reactory/server-modules/reactory-communicator/types/message';
import { resolveEmailTemplate } from '@reactory/server-modules/reactory-communicator/services/emailTemplates';
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
 * Acknowledgement returned by POST /forgot.
 *
 * Identical for every address, present or not. `/forgot` is unauthenticated, so
 * a differentiated response ("Could not find a user with email X") is a
 * user-enumeration oracle: it tells an attacker which addresses have accounts.
 */
export const PASSWORD_RESET_ACKNOWLEDGEMENT =
  'If an account exists for that email address, a password reset link has been sent.';

/**
 * Last-resort subject line for a password reset.
 *
 * The template owns the subject. CommunicatorService.createMessage() applies
 * resolveMessageSubject() with the order template subject > payload subject >
 * none, so this value is used only when the resolved template renders no
 * subject at all. It can never override a subject the template supplies.
 */
export const passwordResetFallbackSubject = (applicationTitle: string): string =>
  `Password reset for ${applicationTitle}`;

/**
 * Join an application's site URL and reset route into an absolute URL.
 *
 * `siteUrl` may or may not end in a slash and `resetEmailRoute` may or may not
 * start with one. Plain concatenation yields `https://app.example.com//forgot-password`
 * or `https://app.example.comforgot-password` depending on the application, so
 * both sides are normalised rather than assumed.
 */
export const buildPasswordResetLink = (
  siteUrl: unknown,
  resetEmailRoute: unknown,
  token: string,
): string => {
  const base = typeof siteUrl === 'string' ? siteUrl.trim().replace(/\/+$/, '') : '';
  const route = typeof resetEmailRoute === 'string' ? resetEmailRoute.trim() : '';
  const normalisedRoute = route.length === 0 ? '' : route.startsWith('/') ? route : `/${route}`;

  return `${base}${normalisedRoute}?auth_token=${token}`;
};

/**
 * Lifetime of a password-reset token, in hours.
 */
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

/**
 * Expiry of a password-reset token, in milliseconds since the epoch.
 *
 * Milliseconds is the unit every consumer of these tokens actually uses:
 * `JWTStrategy` rejects when `moment(payload.exp).isBefore(moment())`, and the
 * PWA client rejects when `payload.exp <= Date.now()`. `Helpers.jwtTokenForUser`
 * mints milliseconds and `jwt-simple` is used here for `encode` only, so there
 * is no seconds-based decode in this path. Emitting `moment().unix()` would
 * make every reset link instantly invalid, because `moment(seconds)` is 1970.
 */
export const passwordResetTokenExpiry = (now: moment.Moment = moment()): number =>
  now.clone().add(PASSWORD_RESET_TOKEN_TTL_HOURS, 'hours').valueOf();

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

    const normalisedEmail = email.trim().toLowerCase();
    const userService = req.context.getService('core.UserService@1.0.0') as Reactory.Service.IReactoryUserService;

    const user = await userService.findUserWithEmail(normalisedEmail);

    if (!user) {
      // Same status and body as the known-address path. Nothing is sent, and the
      // miss is recorded server-side where an operator can see it.
      logger.info(`Password reset requested for an unknown email address: ${normalisedEmail}`);
      return res.status(200).json({ message: PASSWORD_RESET_ACKNOWLEDGEMENT });
    }

    try {
      // Purpose-based resolution. The route names what happened
      // (`password_reset`); the registry owns the view slug and the application's
      // `email_template_password_reset` setting is honoured by the resolver.
      const templateService = req.context.getService('communicator.TemplateService@1.0.0') as any;

      const organization =
        req.organization ?? req.context?.organization ?? req.context?.user?.organization ?? undefined;

      const resolvedTemplate = (await resolveEmailTemplate({
        purpose: 'password_reset',
        templateService,
        partner,
        organization,
      })) as any;

      // Send by the resolved document's id, never by a view slug: the send path
      // resolves `templateId` without a client scope, so a slug could be answered
      // by another application's template. The resolver already pinned this one.
      const templateId = resolvedTemplate?._id
        ? String(resolvedTemplate._id)
        : resolvedTemplate?.id
          ? String(resolvedTemplate.id)
          : undefined;

      if (!templateId) {
        throw new Error('Resolved password_reset template has no identifier');
      }

      const resetToken = Helpers.jwtMake(
        Helpers.jwtTokenForUser(user, { exp: passwordResetTokenExpiry() }),
      );

      const resetLink = buildPasswordResetLink(partner.siteUrl, partner.resetEmailRoute, resetToken);

      const communicatorService = req.context.getService('communicator.CommunicatorService@1.0.0') as any;

      const payload: ISendPayload = {
        partnerId: partner._id?.toString() ?? '',
        userId: user._id?.toString() ?? '',
        channel: Channel.EMAIL,
        to: user.email ?? '',
        subject: passwordResetFallbackSubject(partner.name),
        templateId,
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
      // Never swallow a delivery or resolution failure: the operator needs the
      // provider error, and the caller must not be told the mail was sent.
      logger.error('Failed to send forgot-password email via CommunicatorService', sendError);
      return res.status(500).json({ error: 'Failed to send reset email', message: sendError.message });
    }

    return res.status(200).json({ message: PASSWORD_RESET_ACKNOWLEDGEMENT });
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

