import express from 'express';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import logger from '@reactory/server-core/logging';
import ApiError, { UserExistsError, UserValidationError } from '@reactory/server-core/exceptions';
import {
  ISendPayload,
} from '@reactory/server-modules/reactory-communicator/services/interfaces/ICommunicatorService';
import { Channel, Priority } from '@reactory/server-modules/reactory-communicator/types/message';
import {
  readSettingData,
  resolveEmailTemplate,
} from '@reactory/server-modules/reactory-communicator/services/emailTemplates';
import jwt from 'jwt-simple';
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
      const { user: createdUser, organization } = await userService.selfRegister(
        userInput,
        organizationInput || {},
        partner,
      );

      const token = Helpers.jwtMake(Helpers.jwtTokenForUser(createdUser));

      // Activation email. This runs after the account exists and is deliberately
      // isolated: the owner's decision is that a mail outage must not turn a
      // successful signup into a 500, so a failure here is logged with enough
      // detail to resend and registration still returns 200 with the JWT.
      try {
        await sendRegistrationActivationEmail({
          context: req.context,
          partner,
          user: createdUser,
          organization,
        });
      } catch (activationError: any) {
        logger.error('Failed to prepare or send registration activation email', {
          purpose: 'registration',
          userId: createdUser?._id ? String(createdUser._id) : undefined,
          email: createdUser?.email,
          partnerId: partner?._id ? String(partner._id) : undefined,
          activationRoute: describeActivationRoute(partner),
          reason: activationError?.message,
          stack: activationError?.stack,
        });
      }

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
 *
 * `tokenParam` names the query parameter: reset links use `auth_token` (what the
 * PWA reads today) and activation links use `token`. The normalisation is shared
 * so both links fail in the same way for the same input.
 */
export const buildPasswordResetLink = (
  siteUrl: unknown,
  resetEmailRoute: unknown,
  token: string,
  tokenParam: string = 'auth_token',
): string => {
  const base = typeof siteUrl === 'string' ? siteUrl.trim().replace(/\/+$/, '') : '';
  const route = typeof resetEmailRoute === 'string' ? resetEmailRoute.trim() : '';
  const normalisedRoute = route.length === 0 ? '' : route.startsWith('/') ? route : `/${route}`;

  return `${base}${normalisedRoute}?${tokenParam}=${token}`;
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

/* ------------------------------------------------------------------------- *
 * Account activation (registration)
 * ------------------------------------------------------------------------- */

/**
 * Claim that marks a token as an activation token.
 *
 * `Helpers.jwtTokenForUser` also builds ordinary session payloads. Without this
 * claim, a logged-in user's JWT could be replayed at `GET /activate` and would
 * be accepted as proof of address ownership. Every activation attempt requires
 * it.
 *
 * The claim is defence in depth for the reverse direction only. It does NOT by
 * itself stop an activation token being used as a bearer token - a claim is
 * only as good as every verifier remembering to check it. See
 * `resolveActivationSigningSecret` for the property that actually enforces
 * separation in both directions.
 */
export const ACTIVATION_TOKEN_SCOPE = 'account_activation';

/**
 * Suffix appended to `SECRET_SAUCE` to derive the activation-token signing key.
 *
 * Why a separate key, not just a claim
 * ------------------------------------
 * An activation token is emailed to an unauthenticated person and must be
 * usable for **nothing but** activation. A token signed with `SECRET_SAUCE`
 * is not: `JWTStrategy` verifies with `secretOrKey: SECRET_SAUCE` and, because
 * `Helpers.jwtTokenForUser` produces a session-shaped payload (`userId`,
 * `refresh`, `exp`), its session check is skipped for any token without a
 * `sid` - deliberately, so out-of-band links work. The result is that a
 * session-shaped activation token would have been accepted as a full bearer
 * token for its whole lifetime on every authenticated endpoint.
 *
 * Deriving a distinct key fixes that at the cryptographic layer instead of at
 * the claim layer: `jwt.decode(token, SECRET_SAUCE)` raises
 * "Signature verification failed" for these tokens, which is precisely the
 * check passport-jwt performs, so no authenticated route can ever accept one -
 * including routes that know nothing about activation. The reverse direction
 * (a session token presented at `/activate`) fails the same way.
 *
 * The payload still comes from `Helpers.jwtTokenForUser`, so claim vocabulary
 * (iss/sub/aud/exp/iat/userId/refresh) stays identical to every other token in
 * the platform; only the key is purpose-scoped.
 */
export const ACTIVATION_TOKEN_SECRET_SUFFIX = '::account_activation';

/**
 * The key activation tokens are signed and verified with.
 *
 * Read at call time rather than captured at import time (which is what
 * `helpers.ts` does) so a process that loads configuration late still signs
 * correctly, and so tests cannot leave a stale secret behind.
 *
 * Throws when `SECRET_SAUCE` is unset: signing with `undefined` would produce a
 * token nobody can verify, and verifying with it would accept tokens signed
 * with the literal string 'undefined'. Failing closed is the only safe answer.
 * On the registration path that throw is caught by the non-fatal delivery
 * block; on `/activate` it surfaces as a 500 rather than as "your link is
 * wrong", which is the correct signal for a misconfigured server.
 */
export const resolveActivationSigningSecret = (): string => {
  const base = process.env.SECRET_SAUCE;

  if (typeof base !== 'string' || base.trim().length === 0) {
    throw new Error('SECRET_SAUCE is not set; cannot sign or verify an activation token');
  }

  return `${base}${ACTIVATION_TOKEN_SECRET_SUFFIX}`;
};

/**
 * Lifetime of an activation token, in hours.
 *
 * Longer than a password reset's hour: a reset defends a live session, whereas
 * an activation only proves the address, and people open registration mail the
 * next day.
 */
export const ACTIVATION_TOKEN_TTL_HOURS = 24;

/**
 * Route the activation link points at when the application configures none.
 *
 * This module serves exactly this path (`routes/index.ts` mounts this router at
 * `/useraccount`), so the default cannot dangle. Applications whose API lives on
 * another origin, or that wrap the link in their own page, set
 * `partner.activationEmailRoute` or the `email_activation_route` setting; an
 * absolute URL in either is used verbatim.
 */
export const ACTIVATION_EMAIL_ROUTE_DEFAULT = '/useraccount/activate';

/** Application setting that overrides the activation route. */
export const ACTIVATION_ROUTE_SETTING_KEY = 'email_activation_route';

/** Where a browser is sent after an activation attempt. */
export const ACTIVATION_RESULT_ROUTE_DEFAULT = '/login';

/** Application setting that overrides the post-activation result route. */
export const ACTIVATION_RESULT_ROUTE_SETTING_KEY = 'email_activation_result_route';

/**
 * Expiry of an activation token, in milliseconds since the epoch.
 *
 * Milliseconds for the same reason as `passwordResetTokenExpiry`: this codebase
 * mints `exp` with `moment().valueOf()` and every verifier reads it with
 * `moment(exp)` (JWTStrategy) or compares it with `Date.now()`. Emitting seconds
 * would resolve to 1970 and make every activation link instantly dead.
 */
export const activationTokenExpiry = (now: moment.Moment = moment()): number =>
  now.clone().add(ACTIVATION_TOKEN_TTL_HOURS, 'hours').valueOf();

/**
 * Last-resort subject line for the activation email.
 *
 * As with the reset mail, the template owns the subject: the send path applies
 * template subject > payload subject. This literal is used only when the
 * resolved template renders no usable subject at all.
 */
export const registrationFallbackSubject = (applicationTitle: string): string =>
  `Activate your ${applicationTitle} account`;

/**
 * Responses from `GET /activate`.
 *
 * `invalid` is deliberately shared by "malformed token" and "no such account":
 * the endpoint is unauthenticated, so telling a caller which of the two it was
 * would confirm whether an account exists. Expiry is distinct because it is
 * actionable (request a new mail) and reveals nothing about the account beyond
 * what the caller already holds.
 */
export const ACTIVATION_MESSAGES = {
  activated: 'Your account has been activated.',
  already_activated: 'Your account was already activated.',
  expired: 'This activation link has expired. Request a new activation email.',
  invalid: 'This activation link is not valid. Request a new activation email.',
  missing: 'An activation token is required.',
};

/**
 * `resolveActivationRoute` for a log line: never throws.
 *
 * The failure path must stay failure-proof. If reading the application setting
 * threw (a lean partner without `getSetting`, a malformed settings document),
 * an exception in the logging block would escape the inner catch and turn the
 * signup into a 500 - exactly what this flow must not do.
 */
const describeActivationRoute = (partner: any): string => {
  try {
    return resolveActivationRoute(partner);
  } catch (routeError) {
    return ACTIVATION_EMAIL_ROUTE_DEFAULT;
  }
};

const normaliseRouteSetting = (data: unknown): string | undefined => {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (data && typeof data === 'object') {
    const candidate = data as { route?: unknown; url?: unknown; path?: unknown };
    const value = candidate.route ?? candidate.url ?? candidate.path;
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }

  return undefined;
};

/**
 * The route an activation link should point at for this application.
 *
 * Precedence mirrors `resetEmailRoute`: the document property first, then the
 * application setting (so an administrator can change it without a deploy),
 * then the documented default this module serves.
 */
export const resolveActivationRoute = (partner: any): string => {
  const direct =
    partner && typeof partner.activationEmailRoute === 'string'
      ? partner.activationEmailRoute.trim()
      : '';
  if (direct.length > 0) return direct;

  const fromSetting = normaliseRouteSetting(readSettingData(partner, ACTIVATION_ROUTE_SETTING_KEY));
  if (fromSetting) return fromSetting;

  return ACTIVATION_EMAIL_ROUTE_DEFAULT;
};

/**
 * Build the absolute activation link.
 *
 * Reuses `buildPasswordResetLink`'s normalisation (trailing slashes on the base
 * and a missing leading slash on the route are both handled there) and only
 * changes the query parameter to `token`, which is what the route reads. An
 * absolute route is passed through untouched so a deployment can point the link
 * at an API origin that differs from the client's `siteUrl`.
 */
export const buildActivationLink = (
  siteUrl: unknown,
  activationRoute: unknown,
  token: string,
): string => {
  const route = typeof activationRoute === 'string' ? activationRoute.trim() : '';
  const target = route.length > 0 ? route : ACTIVATION_EMAIL_ROUTE_DEFAULT;

  if (target.startsWith('http://') || target.startsWith('https://')) {
    const separator = target.includes('?') ? '&' : '?';
    return `${target}${separator}token=${token}`;
  }

  return buildPasswordResetLink(siteUrl, target, token, 'token');
};

/**
 * Mint an activation token for `user`, scoped to this application.
 *
 * The payload is built by `Helpers.jwtTokenForUser`, so the claim vocabulary is
 * the platform's (`iss`, `sub`, `aud`, `exp`, `iat`, `userId`, `refresh`). It is
 * then encoded with the purpose-scoped key from
 * `resolveActivationSigningSecret()` rather than `Helpers.jwtMake`'s
 * `SECRET_SAUCE`, which is what makes the token inert on every authenticated
 * endpoint (see that constant's comment).
 *
 * Two claims are added on top of the session shape: `scope` (marks intent) and
 * `clientId` (identifies the application, as the ticket requires).
 */
export const createActivationToken = (
  user: any,
  partner: any,
  now: moment.Moment = moment(),
): { token: string; expiresAt: number } => {
  const expiresAt = activationTokenExpiry(now);
  const payload: any = Helpers.jwtTokenForUser(user, { exp: expiresAt });

  payload.scope = ACTIVATION_TOKEN_SCOPE;
  if (partner && partner._id) payload.clientId = String(partner._id);

  return { token: jwt.encode(payload, resolveActivationSigningSecret()), expiresAt };
};

export type ActivationTokenState = 'valid' | 'expired' | 'invalid';

export interface IActivationTokenInspection {
  state: ActivationTokenState;
  claims?: any;
  reason?: 'malformed' | 'wrong_scope' | 'no_expiry' | 'no_user';
}

/**
 * Verify and classify an activation token.
 *
 * `jwt.decode(token, secret)` verifies the signature (a token signed with a
 * different secret is rejected) but, because `jwt-simple` compares `exp` against
 * seconds, it does not enforce our millisecond lifetime. Expiry is therefore
 * decided here, which is also what lets an expired link be reported as expired
 * instead of as a malformed one.
 *
 * The key is the purpose-scoped one, so a session token - signed with
 * `SECRET_SAUCE` - is rejected here as malformed. That is the mirror image of
 * an activation token being rejected by `JWTStrategy`.
 */
export const inspectActivationToken = (
  token: unknown,
  now: number = Date.now(),
): IActivationTokenInspection => {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return { state: 'invalid', reason: 'malformed' };
  }

  // Resolved before the try: an unconfigured secret is a server fault, not a
  // bad link, and must not be reported to the caller as one.
  const secret = resolveActivationSigningSecret();

  let claims: any;
  try {
    claims = jwt.decode(token.trim(), secret);
  } catch (decodeError) {
    return { state: 'invalid', reason: 'malformed' };
  }

  if (!claims || typeof claims !== 'object') return { state: 'invalid', reason: 'malformed' };
  if (claims.scope !== ACTIVATION_TOKEN_SCOPE) return { state: 'invalid', reason: 'wrong_scope' };
  if (typeof claims.exp !== 'number') return { state: 'invalid', reason: 'no_expiry' };
  if (!claims.userId) return { state: 'invalid', reason: 'no_user' };

  if (claims.exp <= now) return { state: 'expired', claims };

  return { state: 'valid', claims };
};

/**
 * Resolve the registration template and send the activation email.
 *
 * Purpose-based resolution only: the route names `registration`, the purpose
 * registry owns the view slug and the application's
 * `email_template_registration` setting. The send is performed by the resolved
 * document's id, never a slug - the send path resolves `templateId` without a
 * client scope, so a slug could be answered by another application's template.
 */
export const sendRegistrationActivationEmail = async (params: {
  context: any;
  partner: any;
  user: any;
  organization?: any;
}): Promise<boolean> => {
  const { context, partner, user, organization } = params;

  const templateService = context.getService('communicator.TemplateService@1.0.0') as any;

  const resolvedTemplate = (await resolveEmailTemplate({
    purpose: 'registration',
    templateService,
    partner,
    organization,
  })) as any;

  const templateId = resolvedTemplate?._id
    ? String(resolvedTemplate._id)
    : resolvedTemplate?.id
      ? String(resolvedTemplate.id)
      : undefined;

  if (!templateId) {
    throw new Error('Resolved registration template has no identifier');
  }

  const { token } = createActivationToken(user, partner);
  const activationRoute = resolveActivationRoute(partner);
  const activationLink = buildActivationLink(partner?.siteUrl, activationRoute, token);

  if (!partner?.siteUrl) {
    // A relative link in an email is a dead end, so say so loudly - but the
    // account and the token are both valid, so this cannot fail the signup.
    logger.warn('Activation email built without an application siteUrl; the link will be relative', {
      partnerId: partner?._id ? String(partner._id) : undefined,
      activationRoute,
    });
  }

  const communicatorService = context.getService('communicator.CommunicatorService@1.0.0') as any;

  const payload: ISendPayload = {
    partnerId: partner?._id?.toString?.() ?? '',
    userId: user?._id?.toString?.() ?? '',
    channel: Channel.EMAIL,
    to: user?.email ?? '',
    subject: registrationFallbackSubject(partner?.name),
    templateId,
    templateData: {
      user,
      partner,
      applicationTitle: partner?.name,
      // The seeded body interpolates `activationLink`. `activateLink` is kept
      // because a template installed from an earlier release may use it.
      activationLink,
      activateLink: activationLink,
    },
    priority: Priority.HIGH,
  };

  await communicatorService.send(payload);

  return true;
};

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

const prefersHtmlResponse = (req: any): boolean => {
  const accept = req?.headers?.accept;
  return typeof accept === 'string' && accept.includes('text/html');
};

/**
 * Where a browser that followed an email link should land.
 *
 * Returns null when no application site URL is known, in which case the route
 * answers with JSON instead of a redirect to a relative location.
 */
const buildActivationResultUrl = (partner: any, state: string): string | null => {
  if (!partner) return null;

  const declared =
    typeof partner.activationResultRoute === 'string' ? partner.activationResultRoute.trim() : '';

  let fromSetting: string | undefined;
  try {
    fromSetting = normaliseRouteSetting(readSettingData(partner, ACTIVATION_RESULT_ROUTE_SETTING_KEY));
  } catch (settingError) {
    // A settings read must never break the redirect; the default is safe.
    fromSetting = undefined;
  }

  const route =
    declared.length > 0
      ? declared
      : fromSetting || ACTIVATION_RESULT_ROUTE_DEFAULT;

  if (route.startsWith('http://') || route.startsWith('https://')) {
    const separator = route.includes('?') ? '&' : '?';
    return `${route}${separator}activation=${state}`;
  }

  const base = typeof partner.siteUrl === 'string' ? partner.siteUrl.trim() : '';
  if (base.length === 0) return null;

  // Reuses the shared base/route normalisation; the third argument is the value
  // of the query parameter named by the fourth.
  return buildPasswordResetLink(base, route, state, 'activation');
};

/**
 * GET /activate?token=...
 *
 * Consumes the token issued by POST /register and marks the account activated.
 *
 * Reached from an email link, so a browser (`Accept: text/html`) is redirected
 * to the application's result page with `?activation=<state>`; API clients get
 * JSON carrying the same `status` value. Both media types distinguish the
 * states, which is what support needs:
 *
 *   200 activated          the account is now activated
 *   200 already_activated  idempotent repeat of a valid link
 *   410 expired_token      the link is well-formed but past its lifetime
 *   400 invalid_token      malformed/tampered token, or no such account
 *   400 missing_token      no token supplied
 *
 * `invalid_token` is the same answer for a malformed token and an unknown user
 * on purpose: this endpoint is unauthenticated, so a different answer would
 * confirm whether an account exists.
 */
router.get(
  '/activate',
  asyncHandler(async (req: any, res: any) => {
    const partner = req.partner || req.context?.partner;
    // `auth_token` is accepted as an alias so an already-installed template or
    // client that only knows the reset-link parameter still works.
    const rawToken = req.query?.token ?? req.query?.auth_token;
    const wantsHtml = prefersHtmlResponse(req);

    const respond = (statusCode: number, state: string, message: string, extra: any = {}) => {
      if (wantsHtml) {
        const target = buildActivationResultUrl(partner, state);
        if (target) return res.redirect(302, target);
      }

      return res.status(statusCode).json({ status: state, message, ...extra });
    };

    if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      logger.info('Activation attempted without a token');
      return respond(400, 'missing_token', ACTIVATION_MESSAGES.missing);
    }

    const inspection = inspectActivationToken(rawToken);

    if (inspection.state === 'invalid') {
      logger.warn('Activation attempted with an invalid token', { reason: inspection.reason });
      return respond(400, 'invalid_token', ACTIVATION_MESSAGES.invalid);
    }

    if (inspection.state === 'expired') {
      logger.info('Activation attempted with an expired token', {
        userId: inspection.claims?.userId,
        expiredAt:
          typeof inspection.claims?.exp === 'number'
            ? new Date(inspection.claims.exp).toISOString()
            : undefined,
      });
      return respond(410, 'expired_token', ACTIVATION_MESSAGES.expired);
    }

    const userId = String(inspection.claims.userId);
    const userService = req.context.getService('core.UserService@1.0.0') as any;
    const result = await userService.activateUser(userId);

    if (!result) {
      logger.warn(`Activation token referenced an unknown user: ${userId}`);
      return respond(400, 'invalid_token', ACTIVATION_MESSAGES.invalid);
    }

    const activatedAt = result.user?.activatedAt ?? null;

    if (result.alreadyActivated) {
      logger.info(`Activation repeated for already-activated user ${userId}`);
      return respond(200, 'already_activated', ACTIVATION_MESSAGES.already_activated, {
        activatedAt,
      });
    }

    logger.info(`Account activated for user ${userId}`);
    return respond(200, 'activated', ACTIVATION_MESSAGES.activated, { activatedAt });
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

