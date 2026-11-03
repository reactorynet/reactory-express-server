import express from 'express';
import request from 'supertest';
import moment from 'moment';
import jwt from 'jwt-simple';
import jsonwebtoken from 'jsonwebtoken';
import { readFileSync } from 'fs';
import * as path from 'path';
import ejs from 'ejs';

import {
  EMAIL_TEMPLATE_PURPOSES,
} from '@reactory/server-modules/reactory-communicator/services/emailTemplates';
import { DEFAULT_EMAIL_TEMPLATES } from '@reactory/server-modules/reactory-communicator/seeding/defaultEmailTemplates';
import { resolveTemplateRef } from '@reactory/server-modules/reactory-communicator/seeding/templateRefResolver';
import { buildEmailRenderContext } from '@reactory/server-modules/reactory-communicator/services/emailRenderContext';
import { htmlToText } from '@reactory/server-modules/reactory-communicator/services/providers/emailSupport';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import logger from '@reactory/server-core/logging';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import { UserExistsError, UserValidationError } from '@reactory/server-core/exceptions';

import UserAccountRouter, {
  ACTIVATION_EMAIL_ROUTE_DEFAULT,
  ACTIVATION_MESSAGES,
  ACTIVATION_RESULT_ROUTE_DEFAULT,
  ACTIVATION_RESULT_ROUTE_SETTING_KEY,
  ACTIVATION_TOKEN_SCOPE,
  ACTIVATION_TOKEN_SECRET_SUFFIX,
  ACTIVATION_TOKEN_TTL_HOURS,
  ACTIVATION_ROUTE_SETTING_KEY,
  buildActivationLink,
  createActivationToken,
  inspectActivationToken,
  resolveActivationSigningSecret,
} from '../UserAccount';

const mockLogger = logger as any;

const CREATED_USER: any = {
  _id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

const makePartner = (overrides: any = {}) => {
  const settings = overrides.settings || {};

  const partner: any = {
    _id: 'partner-1',
    name: 'Reactory',
    siteUrl: 'https://app.example.com',
    resetEmailRoute: '/forgot-password',
    getSetting: jest.fn((name: string) => ({ data: settings[name] })),
    ...overrides,
  };

  return partner;
};

interface IHarnessOptions {
  partner?: any;
  resolveTemplate?: jest.Mock;
  send?: jest.Mock;
  selfRegister?: jest.Mock;
  /** When true, `activateUser` reports that no such account exists. */
  unknownUser?: boolean;
  /** Pre-existing activation timestamp (idempotency tests). */
  userActivatedAt?: Date | null;
}

const buildHarness = (options: IHarnessOptions = {}) => {
  const partner = options.partner ?? makePartner();

  const send = options.send ?? jest.fn().mockResolvedValue({ _id: 'message-1' });

  const resolveTemplate =
    options.resolveTemplate ??
    jest.fn(async (ref: string) => ({ _id: 'registration-template-id', view: ref }));

  const selfRegister = options.selfRegister ?? jest.fn(async () => ({
    user: { ...CREATED_USER },
    organization: { _id: 'org-1', name: 'Founder Holdings' },
  }));

  // Stateful across calls in one harness so the idempotency test exercises the
  // same account twice, exactly as two clicks on one email link would.
  let activatedAt: Date | null = options.userActivatedAt ?? null;

  const activateUser = jest.fn(async (userId: string) => {
    if (options.unknownUser) return null;
    if (userId !== String(CREATED_USER._id)) return null;

    if (activatedAt) {
      return { user: { ...CREATED_USER, activatedAt }, alreadyActivated: true };
    }

    activatedAt = new Date();
    return { user: { ...CREATED_USER, activatedAt }, alreadyActivated: false };
  });

  const userService = { selfRegister, activateUser, findUserWithEmail: jest.fn() };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.partner = partner;
    req.context = {
      getService: (id: string) => {
        if (id === 'core.UserService@1.0.0') return userService;
        if (id === 'communicator.TemplateService@1.0.0') return { resolveTemplate };
        if (id === 'communicator.CommunicatorService@1.0.0') return { send };
        throw new Error(`Unexpected service requested: ${id}`);
      },
    };
    next();
  });
  app.use('/useraccount', UserAccountRouter);

  return { app, partner, send, resolveTemplate, selfRegister, activateUser };
};

const registrationBody = () => ({
  user: {
    email: CREATED_USER.email,
    password: 'Sup3r-secret!',
    firstName: CREATED_USER.firstName,
    lastName: CREATED_USER.lastName,
  },
  organization: { name: 'Founder Holdings' },
});

const sentPayload = (send: jest.Mock): any => {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0];
};

const tokenFromLink = (link: string): string =>
  new URL(link).searchParams.get('token') as string;

const pathAndQuery = (link: string): string => {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /useraccount/register - activation email', () => {
  it('resolves the registration purpose and sends exactly one email', async () => {
    const harness = buildHarness();

    const response = await request(harness.app).post('/useraccount/register').send(registrationBody());

    expect(response.status).toBe(200);

    // The route names a purpose; the registry owns the view slug.
    expect(harness.resolveTemplate).toHaveBeenCalledTimes(1);
    expect(harness.resolveTemplate.mock.calls[0][0]).toBe(
      EMAIL_TEMPLATE_PURPOSES.registration.defaultView,
    );

    // ... and the application scope is carried through to the E1 resolver.
    expect(harness.resolveTemplate.mock.calls[0][1]).toMatchObject({
      clientId: 'partner-1',
      kind: 'email',
    });

    const payload = sentPayload(harness.send);
    expect(payload.to).toBe(CREATED_USER.email);
    expect(payload.templateId).toBe('registration-template-id');
    expect(payload.templateId).not.toBe(EMAIL_TEMPLATE_PURPOSES.registration.defaultView);
    expect(payload.channel).toBe('email');
  });

  it('carries the template data the activation template reads', async () => {
    const harness = buildHarness();

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const payload = sentPayload(harness.send);
    const data = payload.templateData;

    expect(data.applicationTitle).toBe('Reactory');
    expect(data.partner).toBe(harness.partner);
    expect(data.user.email).toBe(CREATED_USER.email);

    // The shipped body interpolates `activationLink`; `activateLink` is the
    // compatibility alias for templates installed from an earlier release.
    expect(typeof data.activationLink).toBe('string');
    expect(data.activationLink).toBe(data.activateLink);
    expect(data.activationLink).toContain('https://app.example.com');
  });

  it('sends the activation link to the route this module serves when the application configures none', async () => {
    const harness = buildHarness();

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const link = sentPayload(harness.send).templateData.activationLink;

    expect(link.startsWith(`https://app.example.com${ACTIVATION_EMAIL_ROUTE_DEFAULT}?token=`)).toBe(
      true,
    );
    expect(tokenFromLink(link).length).toBeGreaterThan(20);
  });

  it('does not hardcode a transactional view slug in the route or the service', () => {
    const routeSource = readFileSync(path.join(__dirname, '..', 'UserAccount.ts'), 'utf8');
    const serviceSource = readFileSync(
      path.join(__dirname, '..', '..', '..', 'services', 'UserService.ts'),
      'utf8',
    );

    ['activation-email', 'forgot-password-email'].forEach((slug) => {
      expect(routeSource).not.toContain(slug);
      expect(serviceSource).not.toContain(slug);
    });

    // The purpose id itself is what the route is allowed to name.
    expect(routeSource).toContain("purpose: 'registration'");
  });
});

describe('POST /useraccount/register - activation link construction', () => {
  const expected = 'https://app.example.com/useraccount/activate?token=token-123';

  it.each([
    ['https://app.example.com', ACTIVATION_EMAIL_ROUTE_DEFAULT],
    ['https://app.example.com/', ACTIVATION_EMAIL_ROUTE_DEFAULT],
    ['https://app.example.com', 'useraccount/activate'],
    ['https://app.example.com/', 'useraccount/activate'],
  ])('normalises siteUrl %s with route %s', (siteUrl, route) => {
    expect(buildActivationLink(siteUrl, route, 'token-123')).toBe(expected);
  });

  it('produces a well-formed link at the route level for a trailing-slash siteUrl', async () => {
    const harness = buildHarness({ partner: makePartner({ siteUrl: 'https://app.example.com/' }) });

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const link = sentPayload(harness.send).templateData.activationLink;

    expect(link.startsWith('https://app.example.com/useraccount/activate?token=')).toBe(true);
    expect(link).not.toContain('//useraccount');
    expect(link).not.toContain('comuseraccount');
  });

  it('honours the email_activation_route application setting', async () => {
    const partner = makePartner({ settings: { [ACTIVATION_ROUTE_SETTING_KEY]: '/activate' } });
    const harness = buildHarness({ partner });

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const link = sentPayload(harness.send).templateData.activationLink;

    expect(partner.getSetting).toHaveBeenCalledWith(ACTIVATION_ROUTE_SETTING_KEY);
    expect(link.startsWith('https://app.example.com/activate?token=')).toBe(true);
  });

  it('uses an absolute configured route verbatim, so the API may live on another origin', async () => {
    const partner = makePartner({
      settings: { [ACTIVATION_ROUTE_SETTING_KEY]: 'https://api.example.com/useraccount/activate' },
    });
    const harness = buildHarness({ partner });

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const link = sentPayload(harness.send).templateData.activationLink;

    expect(link.startsWith('https://api.example.com/useraccount/activate?token=')).toBe(true);
  });

  it('prefers the partner property, mirroring resetEmailRoute', async () => {
    const partner = makePartner({ activationEmailRoute: '/account/activate' });
    const harness = buildHarness({ partner });

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const link = sentPayload(harness.send).templateData.activationLink;

    expect(link.startsWith('https://app.example.com/account/activate?token=')).toBe(true);
  });

  it('warns instead of failing when the application has no siteUrl', async () => {
    const partner = makePartner({ siteUrl: undefined });
    const harness = buildHarness({ partner });

    const response = await request(harness.app).post('/useraccount/register').send(registrationBody());

    expect(response.status).toBe(200);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('without an application siteUrl'),
      expect.objectContaining({ activationRoute: ACTIVATION_EMAIL_ROUTE_DEFAULT }),
    );
  });
});

describe('POST /useraccount/register - delivery failures are non-fatal', () => {
  it('still returns 200, still creates the user and logs a retryable failure when the provider rejects', async () => {
    const providerError = new Error('smtp provider unavailable');
    const harness = buildHarness({ send: jest.fn().mockRejectedValue(providerError) });

    const response = await request(harness.app).post('/useraccount/register').send(registrationBody());

    // The account exists; a mail outage must not turn signup into a 500.
    expect(response.status).toBe(200);
    expect(harness.selfRegister).toHaveBeenCalledTimes(1);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(20);
    expect(response.body.firstName).toBe(CREATED_USER.firstName);

    const [message, context] = mockLogger.error.mock.calls[0];
    expect(message).toBe('Failed to prepare or send registration activation email');
    expect(context).toMatchObject({
      purpose: 'registration',
      userId: String(CREATED_USER._id),
      email: CREATED_USER.email,
      partnerId: 'partner-1',
      reason: providerError.message,
    });
  });

  it('still returns 200 when the template cannot be resolved', async () => {
    const resolutionError = new Error('no template for purpose registration');
    const harness = buildHarness({ resolveTemplate: jest.fn().mockRejectedValue(resolutionError) });

    const response = await request(harness.app).post('/useraccount/register').send(registrationBody());

    expect(response.status).toBe(200);
    expect(harness.send).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error.mock.calls[0][0]).toBe(
      'Failed to prepare or send registration activation email',
    );
  });

  it('does not attempt an activation email when registration itself fails', async () => {
    const harness = buildHarness({
      selfRegister: jest.fn().mockRejectedValue(new Error('duplicate key')),
    });

    const response = await request(harness.app).post('/useraccount/register').send(registrationBody());

    expect(response.status).toBe(500);
    expect(harness.resolveTemplate).not.toHaveBeenCalled();
    expect(harness.send).not.toHaveBeenCalled();
  });
});

describe('GET /useraccount/activate - token consumption', () => {
  it('consumes the link from the registration email, activates the account and is idempotent', async () => {
    const harness = buildHarness();

    const registration = await request(harness.app)
      .post('/useraccount/register')
      .send(registrationBody());

    expect(registration.status).toBe(200);

    const link = sentPayload(harness.send).templateData.activationLink;

    const first = await request(harness.app).get(pathAndQuery(link));

    expect(first.status).toBe(200);
    expect(first.body.status).toBe('activated');
    expect(first.body.message).toBe(ACTIVATION_MESSAGES.activated);
    expect(first.body.activatedAt).toBeTruthy();
    expect(harness.activateUser).toHaveBeenCalledWith(String(CREATED_USER._id));

    const second = await request(harness.app).get(pathAndQuery(link));

    expect(second.status).toBe(200);
    expect(second.body.status).toBe('already_activated');
    expect(second.body.message).toBe(ACTIVATION_MESSAGES.already_activated);

    // The original timestamp survives; a repeat is not a second activation.
    expect(second.body.activatedAt).toBe(first.body.activatedAt);
  });

  it('reports an already-activated account without error', async () => {
    const harness = buildHarness({ userActivatedAt: new Date('2026-01-01T10:00:00.000Z') });
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app).get('/useraccount/activate').query({ token });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('already_activated');
    expect(response.body.activatedAt).toBe('2026-01-01T10:00:00.000Z');
  });

  it('accepts auth_token as an alias for templates that use the reset parameter', async () => {
    const harness = buildHarness();
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ auth_token: token });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('activated');
  });
});

describe('GET /useraccount/activate - token states are distinguishable', () => {
  it('rejects a missing token with its own state', async () => {
    const harness = buildHarness();

    const response = await request(harness.app).get('/useraccount/activate');

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('missing_token');
    expect(response.body.message).toBe(ACTIVATION_MESSAGES.missing);
    expect(harness.activateUser).not.toHaveBeenCalled();
  });

  it('rejects a malformed token as invalid', async () => {
    const harness = buildHarness();

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token: 'not-a-jwt' });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('invalid_token');
    expect(response.body.message).toBe(ACTIVATION_MESSAGES.invalid);
    expect(harness.activateUser).not.toHaveBeenCalled();
  });

  it('rejects a tampered token as invalid', async () => {
    const harness = buildHarness();
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token: `${token}tampered` });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('invalid_token');
  });

  it('rejects a session token: activation requires the activation scope', async () => {
    const harness = buildHarness();
    // Exactly what POST /register returns to the client - no activation scope.
    const sessionToken = Helpers.jwtMake(Helpers.jwtTokenForUser(CREATED_USER));

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token: sessionToken });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('invalid_token');
    expect(harness.activateUser).not.toHaveBeenCalled();
  });

  it('rejects an expired token as expired, not as malformed', async () => {
    const harness = buildHarness();
    const { token, expiresAt } = createActivationToken(
      CREATED_USER,
      harness.partner,
      moment().subtract(2, 'days'),
    );

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token });

    expect(expiresAt).toBeLessThan(Date.now());
    expect(response.status).toBe(410);
    expect(response.body.status).toBe('expired_token');
    expect(response.body.message).toBe(ACTIVATION_MESSAGES.expired);
    expect(harness.activateUser).not.toHaveBeenCalled();
  });

  it('does not disclose whether an unknown account exists', async () => {
    const unknownHarness = buildHarness({ unknownUser: true });
    const malformedHarness = buildHarness();

    const { token } = createActivationToken(CREATED_USER, unknownHarness.partner);

    const unknown = await request(unknownHarness.app)
      .get('/useraccount/activate')
      .query({ token });

    const malformed = await request(malformedHarness.app)
      .get('/useraccount/activate')
      .query({ token: 'not-a-jwt' });

    expect(unknown.status).toBe(malformed.status);
    expect(unknown.body).toEqual(malformed.body);
    expect(unknown.text).toBe(malformed.text);

    // The distinction is recorded server-side where support can see it.
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`unknown user: ${CREATED_USER._id}`),
    );
  });

  it('redirects a browser that followed the email link to the application result page', async () => {
    const harness = buildHarness();
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      `https://app.example.com${ACTIVATION_RESULT_ROUTE_DEFAULT}?activation=activated`,
    );
  });

  it('redirects an expired browser link with the expired state', async () => {
    const harness = buildHarness();
    const { token } = createActivationToken(
      CREATED_USER,
      harness.partner,
      moment().subtract(2, 'days'),
    );

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      `https://app.example.com${ACTIVATION_RESULT_ROUTE_DEFAULT}?activation=expired_token`,
    );
  });
});

describe('activation token lifetime and scope', () => {
  it('mints exp in milliseconds: valid before expiry, rejected after', () => {
    const now = moment('2026-11-03T12:00:00.000Z');
    const { token, expiresAt } = createActivationToken(CREATED_USER, makePartner(), now);

    const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
    const claims = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));

    // Milliseconds, like every other token this server mints and reads. A
    // seconds value would read as 1970 and every link would be dead on arrival.
    expect(typeof claims.exp).toBe('number');
    expect(claims.exp).toBeGreaterThan(1e12);
    expect(claims.exp).toBe(expiresAt);
    expect(claims.exp).toBe(
      now.clone().add(ACTIVATION_TOKEN_TTL_HOURS, 'hours').valueOf(),
    );

    expect(claims.scope).toBe(ACTIVATION_TOKEN_SCOPE);
    expect(claims.clientId).toBe('partner-1');
    expect(claims.userId).toBe(String(CREATED_USER._id));

    expect(claims.exp).toBeGreaterThan(now.clone().add(ACTIVATION_TOKEN_TTL_HOURS - 1, 'hours').valueOf());
    expect(claims.exp).toBeLessThan(now.clone().add(ACTIVATION_TOKEN_TTL_HOURS + 1, 'hours').valueOf());
  });

  it('is rejected by the route once the lifetime has passed', async () => {
    const harness = buildHarness();
    const { token } = createActivationToken(
      CREATED_USER,
      harness.partner,
      moment().subtract(ACTIVATION_TOKEN_TTL_HOURS + 1, 'hours'),
    );

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token });

    expect(response.status).toBe(410);
    expect(response.body.status).toBe('expired_token');
  });
});

describe('activation token cannot be used as a bearer token (B1)', () => {
  it('is not verifiable with the session key JWTStrategy is configured with', () => {
    const partner = makePartner();
    const { token } = createActivationToken(CREATED_USER, partner);
    const sessionKey = process.env.SECRET_SAUCE as string;

    // JWTStrategy is configured with `secretOrKey: process.env.SECRET_SAUCE`,
    // and passport-jwt (JwtVerifier) calls `jsonwebtoken.verify(token, key)`.
    // A signature mismatch there is a 401 on every authenticated route, which
    // is exactly the property the ticket requires - and it holds for routes
    // that know nothing about activation.
    expect(() => jsonwebtoken.verify(token, sessionKey)).toThrow(/invalid signature/i);
    expect(() => jwt.decode(token, sessionKey)).toThrow(/signature/i);

    // The same token verifies under its own purpose-scoped key, so the
    // separation costs the activation flow nothing.
    const ownClaims = jsonwebtoken.verify(
      token,
      resolveActivationSigningSecret(),
    ) as jsonwebtoken.JwtPayload;

    expect(ownClaims.userId).toBe(String(CREATED_USER._id));

    // The payload IS session-shaped (that is why the key has to do the work),
    // so the same payload signed with the session key would verify. This pins
    // the mechanism rather than the symptom.
    const sessionShaped = Helpers.jwtTokenForUser(CREATED_USER, { exp: Date.now() + 60000 });
    expect(jwt.decode(jwt.encode(sessionShaped, sessionKey), sessionKey).userId).toBe(
      String(CREATED_USER._id),
    );

    // The purpose-scoped key is what reads it.
    expect(jwt.decode(token, resolveActivationSigningSecret()).scope).toBe(ACTIVATION_TOKEN_SCOPE);
  });

  it('derives a key that is distinct from the session key', () => {
    expect(resolveActivationSigningSecret()).toBe(
      `${process.env.SECRET_SAUCE}${ACTIVATION_TOKEN_SECRET_SUFFIX}`,
    );
    expect(resolveActivationSigningSecret()).not.toBe(process.env.SECRET_SAUCE);
  });

  it('refuses to sign at all when SECRET_SAUCE is unset', () => {
    const original = process.env.SECRET_SAUCE;

    try {
      delete process.env.SECRET_SAUCE;
  
      expect(() => resolveActivationSigningSecret()).toThrow(/SECRET_SAUCE is not set/);
    } finally {
      process.env.SECRET_SAUCE = original;
    }
  });

  it('still rejects a session token at /activate, in both directions', async () => {
    const harness = buildHarness();
    const sessionToken = Helpers.jwtMake(Helpers.jwtTokenForUser(CREATED_USER));

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token: sessionToken });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('invalid_token');
    expect(inspectActivationToken(sessionToken).state).toBe('invalid');
  });
});

describe('activation token claims beyond the happy path', () => {
  const signWithActivationKey = (payload: any): string =>
    jwt.encode(payload, resolveActivationSigningSecret());

  it('rejects a token with no expiry', () => {
    const token = signWithActivationKey({ userId: String(CREATED_USER._id), scope: ACTIVATION_TOKEN_SCOPE });

    expect(inspectActivationToken(token)).toEqual({ state: 'invalid', reason: 'no_expiry' });
  });

  it('rejects a token with no user identity', () => {
    const token = signWithActivationKey({ scope: ACTIVATION_TOKEN_SCOPE, exp: Date.now() + 60000 });

    expect(inspectActivationToken(token)).toEqual({ state: 'invalid', reason: 'no_user' });
  });

  it('rejects a token signed with the activation key but a different scope', () => {
    const token = signWithActivationKey({
      userId: String(CREATED_USER._id),
      exp: Date.now() + 60000,
      scope: 'password_reset',
    });

    expect(inspectActivationToken(token)).toEqual({ state: 'invalid', reason: 'wrong_scope' });
  });
});

describe('activation-email template rendering', () => {
  it('renders a non-empty subject, html and text with real template data', async () => {
    const definition = DEFAULT_EMAIL_TEMPLATES.find(
      (template) => template.view === EMAIL_TEMPLATE_PURPOSES.registration.defaultView,
    ) as any;

    expect(definition).toBeDefined();

    const subjectElement = definition.elements.find((element: any) => element.role === 'subject');
    const bodyElement = definition.elements.find((element: any) => element.role === 'body');

    const activationLink = 'https://app.example.com/useraccount/activate?token=abc.def.ghi';

    const context = await buildEmailRenderContext({
      user: CREATED_USER,
      partner: makePartner(),
      applicationTitle: 'Reactory',
      activationLink,
      activateLink: activationLink,
    });

    const subject = ejs.render(subjectElement.content, context).trim();
    const bodySource = resolveTemplateRef(bodyElement.content).content;
    const html = ejs.render(bodySource, context).trim();
    const text = htmlToText(html).trim();

    expect(subject.length).toBeGreaterThan(0);
    expect(html.length).toBeGreaterThan(0);
    expect(text.length).toBeGreaterThan(0);

    expect(html).toContain(activationLink);
    expect(text).toContain(activationLink);
  });
});

describe('registration and activation - uncovered branches', () => {
  it('logs and continues when the resolved template has no identifier', async () => {
    const harness = buildHarness({ resolveTemplate: jest.fn(async () => ({})) });

    const response = await request(harness.app)
      .post('/useraccount/register')
      .send(registrationBody());

    expect(response.status).toBe(200);
    expect(harness.send).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to prepare or send registration activation email',
      expect.objectContaining({ reason: 'Resolved registration template has no identifier' }),
    );
  });

  it('survives a throwing getSetting during the failure log and still returns 200', async () => {
    const partner = makePartner({
      getSetting: jest.fn(() => {
        throw new Error('settings store offline');
      }),
    });
    const providerError = new Error('smtp provider unavailable');
    const harness = buildHarness({
      partner,
      send: jest.fn().mockRejectedValue(providerError),
    });

    const response = await request(harness.app)
      .post('/useraccount/register')
      .send(registrationBody());

    // The settings read happens inside the email path, so it fails there; the
    // log that records the failure must not itself throw.
    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error.mock.calls[0][1]).toMatchObject({
      activationRoute: ACTIVATION_EMAIL_ROUTE_DEFAULT,
    });
  });

  it('accepts the object form of the activation route setting', async () => {
    const partner = makePartner({
      settings: { [ACTIVATION_ROUTE_SETTING_KEY]: { route: '/account/activate' } },
    });
    const harness = buildHarness({ partner });

    await request(harness.app).post('/useraccount/register').send(registrationBody());

    const link = sentPayload(harness.send).templateData.activationLink;
    expect(link.startsWith('https://app.example.com/account/activate?token=')).toBe(true);
  });

  it('honours the activationResultRoute document property when redirecting', async () => {
    const harness = buildHarness({
      partner: makePartner({ activationResultRoute: '/welcome' }),
    });
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      'https://app.example.com/welcome?activation=activated',
    );
  });

  it('honours the result-route setting when the document property is absent', async () => {
    const harness = buildHarness({
      partner: makePartner({
        settings: { [ACTIVATION_RESULT_ROUTE_SETTING_KEY]: { path: '/done' } },
      }),
    });
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://app.example.com/done?activation=activated');
  });

  it('answers JSON to an HTML client when there is no siteUrl to redirect to', async () => {
    const harness = buildHarness({
      partner: makePartner({ siteUrl: undefined, activationResultRoute: '/login' }),
    });
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('activated');
  });

  it('maps a validation failure to 400 and still sends no email', async () => {
    const harness = buildHarness({
      selfRegister: jest
        .fn()
        .mockRejectedValue(new UserValidationError('Email is required', { field: 'email' })),
    });

    const response = await request(harness.app)
      .post('/useraccount/register')
      .send(registrationBody());

    expect(response.status).toBe(400);
    expect(harness.resolveTemplate).not.toHaveBeenCalled();
    expect(harness.send).not.toHaveBeenCalled();
  });

  it('maps an existing email to 409 and still sends no email', async () => {
    const harness = buildHarness({
      selfRegister: jest
        .fn()
        .mockRejectedValue(
          new UserExistsError('A user with that email already exists', {
            email: CREATED_USER.email,
          }),
        ),
    });

    const response = await request(harness.app)
      .post('/useraccount/register')
      .send(registrationBody());

    expect(response.status).toBe(409);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it('classifies an empty or non-string token as malformed without touching the crypto', () => {
    expect(inspectActivationToken('')).toEqual({ state: 'invalid', reason: 'malformed' });
    expect(inspectActivationToken('   ')).toEqual({ state: 'invalid', reason: 'malformed' });
    expect(inspectActivationToken(undefined)).toEqual({ state: 'invalid', reason: 'malformed' });
    expect(inspectActivationToken(42)).toEqual({ state: 'invalid', reason: 'malformed' });
  });

  it('redirects to the default when the result-route setting throws', async () => {
    const partner = makePartner({
      getSetting: jest.fn(() => {
        throw new Error('settings store offline');
      }),
    });
    const harness = buildHarness({ partner });
    const { token } = createActivationToken(CREATED_USER, partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    // A broken settings read must not break the redirect the recipient needs.
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      `https://app.example.com${ACTIVATION_RESULT_ROUTE_DEFAULT}?activation=activated`,
    );
  });

  it('redirects to an absolute result route verbatim', async () => {
    const harness = buildHarness({
      partner: makePartner({ activationResultRoute: 'https://client.example.com/activated' }),
    });
    const { token } = createActivationToken(CREATED_USER, harness.partner);

    const response = await request(harness.app)
      .get('/useraccount/activate')
      .query({ token })
      .set('Accept', 'text/html');

    expect(response.headers.location).toBe(
      'https://client.example.com/activated?activation=activated',
    );
  });
});
