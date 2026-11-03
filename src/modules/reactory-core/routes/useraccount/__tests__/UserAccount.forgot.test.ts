import express from 'express';
import request from 'supertest';
import moment from 'moment';

import { resolveMessageSubject } from '@reactory/server-modules/reactory-communicator/services/emailTemplates';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import logger from '@reactory/server-core/logging';

import UserAccountRouter, {
  PASSWORD_RESET_ACKNOWLEDGEMENT,
  PASSWORD_RESET_TOKEN_TTL_HOURS,
  buildPasswordResetLink,
  passwordResetFallbackSubject,
} from '../UserAccount';

const mockLogger = logger as any;

const KNOWN_EMAIL = 'ada@example.com';

const knownUser: any = {
  _id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: KNOWN_EMAIL,
};

const makePartner = (overrides: any = {}) => ({
  _id: 'partner-1',
  name: 'Reactory',
  siteUrl: 'https://app.example.com',
  resetEmailRoute: '/forgot-password',
  getSetting: jest.fn(() => ({ data: undefined })),
  ...overrides,
});

interface IHarnessOptions {
  partner?: any;
  /** When present, every lookup returns this value (use null for "no account"). */
  user?: any;
  send?: jest.Mock;
  resolveTemplate?: jest.Mock;
  context?: any;
}

const buildHarness = (options: IHarnessOptions = {}) => {
  const partner = options.partner ?? makePartner();
  const send = options.send ?? jest.fn().mockResolvedValue({ _id: 'message-1' });
  const resolveTemplate =
    options.resolveTemplate ??
    jest.fn(async (ref: string) => ({ _id: 'template-1', view: ref }));
  const hasUserOverride = Object.prototype.hasOwnProperty.call(options, 'user');

  const findUserWithEmail = jest.fn(async (email: string) => {
    if (hasUserOverride) return options.user;
    return email === KNOWN_EMAIL ? knownUser : null;
  });

  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.partner = partner;
    req.context = {
      ...(options.context || {}),
      getService: (id: string) => {
        if (id === 'core.UserService@1.0.0') return { findUserWithEmail };
        if (id === 'communicator.TemplateService@1.0.0') return { resolveTemplate };
        if (id === 'communicator.CommunicatorService@1.0.0') return { send };
        throw new Error('Unexpected service requested: ' + id);
      },
    };
    next();
  });
  app.use('/useraccount', UserAccountRouter);

  return { app, partner, send, resolveTemplate, findUserWithEmail };
};

const decodeTokenPayload = (token: string): any => {
  // JWT layout is header.payload.signature - exp lives in the payload.
  const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
};

const tokenFromLink = (link: string): string => new URL(link).searchParams.get('auth_token') as string;

const sentPayload = (send: jest.Mock): any => {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0];
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /useraccount/forgot - template resolution', () => {
  it('resolves the password_reset purpose instead of naming a view slug', async () => {
    const harness = buildHarness();

    const response = await request(harness.app)
      .post('/useraccount/forgot')
      .send({ email: KNOWN_EMAIL });

    expect(response.status).toBe(200);

    // The route names a purpose; the registry owns the slug.
    expect(harness.resolveTemplate).toHaveBeenCalledTimes(1);
    expect(harness.resolveTemplate.mock.calls[0][0]).toBe('forgot-password-email');

    // ... and the application scope is carried through to E1's resolver.
    expect(harness.resolveTemplate.mock.calls[0][1]).toMatchObject({
      clientId: 'partner-1',
      kind: 'email',
    });

    // No hardcoded id reaches the send path: the resolved document's id does.
    const payload = sentPayload(harness.send);
    expect(payload.templateId).toBe('template-1');
    expect(payload.templateId).not.toBe('forgot-password');
    expect(payload.templateId).not.toBe('forgot-password-email');
  });

  it('honours the application email_template_password_reset setting', async () => {
    const partner = makePartner({
      getSetting: jest.fn((name: string) =>
        name === 'email_template_password_reset' ? { data: 'booktutor-reset-email' } : { data: undefined },
      ),
    });
    const harness = buildHarness({ partner });

    const response = await request(harness.app)
      .post('/useraccount/forgot')
      .send({ email: KNOWN_EMAIL });

    expect(response.status).toBe(200);
    expect(partner.getSetting).toHaveBeenCalledWith('email_template_password_reset');
    expect(harness.resolveTemplate).toHaveBeenCalledTimes(1);
    expect(harness.resolveTemplate.mock.calls[0][0]).toBe('booktutor-reset-email');
  });

  it('forwards an organization to the resolver when the request has one', async () => {
    const harness = buildHarness({ context: { organization: { _id: 'org-9' } } });

    const response = await request(harness.app)
      .post('/useraccount/forgot')
      .send({ email: KNOWN_EMAIL });

    expect(response.status).toBe(200);
    expect(harness.resolveTemplate.mock.calls[0][1]).toMatchObject({
      clientId: 'partner-1',
      organizationId: 'org-9',
      kind: 'email',
    });
  });

  it('sends exactly one templated email for a known address', async () => {
    const harness = buildHarness();

    await request(harness.app).post('/useraccount/forgot').send({ email: KNOWN_EMAIL });

    const payload = sentPayload(harness.send);
    expect(harness.send).toHaveBeenCalledTimes(1);
    expect(payload.to).toBe(KNOWN_EMAIL);
    expect(payload.templateData.applicationTitle).toBe('Reactory');
    expect(payload.templateData.resetLink).toContain('?auth_token=');
  });
});

describe('POST /useraccount/forgot - subject precedence', () => {
  it('lets a template-rendered subject beat the route literal', async () => {
    const harness = buildHarness();

    await request(harness.app).post('/useraccount/forgot').send({ email: KNOWN_EMAIL });

    const payload = sentPayload(harness.send);
    expect(payload.subject).toBe(passwordResetFallbackSubject('Reactory'));

    // This is the composition the send path performs (CommunicatorService.createMessage).
    const chosen = resolveMessageSubject({
      templateSubject: 'Reset your Reactory password',
      payloadSubject: payload.subject,
    });

    expect(chosen).toBe('Reset your Reactory password');
  });

  it('uses the literal only when the template renders no usable subject', async () => {
    const harness = buildHarness();

    await request(harness.app).post('/useraccount/forgot').send({ email: KNOWN_EMAIL });

    const payload = sentPayload(harness.send);

    // Empty and whitespace-only template subjects are not usable, so the
    // caller's literal is the last resort rather than an empty subject line.
    expect(resolveMessageSubject({ templateSubject: '', payloadSubject: payload.subject })).toBe(
      'Password reset for Reactory',
    );
    expect(resolveMessageSubject({ templateSubject: '   ', payloadSubject: payload.subject })).toBe(
      'Password reset for Reactory',
    );
  });
});

describe('POST /useraccount/forgot - account existence is not disclosed', () => {
  it('returns 200, sends nothing and logs the miss for an unknown address', async () => {
    const harness = buildHarness({ user: null });

    const response = await request(harness.app)
      .post('/useraccount/forgot')
      .send({ email: 'nobody@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: PASSWORD_RESET_ACKNOWLEDGEMENT });
    expect(harness.send).not.toHaveBeenCalled();
    expect(harness.resolveTemplate).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('nobody@example.com'));
  });

  it('produces a response indistinguishable from the known-address case', async () => {
    const unknownHarness = buildHarness({ user: null });
    const knownHarness = buildHarness();

    const unknown = await request(unknownHarness.app)
      .post('/useraccount/forgot')
      .send({ email: 'nobody@example.com' });
    const known = await request(knownHarness.app)
      .post('/useraccount/forgot')
      .send({ email: KNOWN_EMAIL });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(unknown.text).toBe(known.text);
    expect(unknown.headers['content-type']).toBe(known.headers['content-type']);
  });

  it('still validates a missing email', async () => {
    const harness = buildHarness();

    const response = await request(harness.app).post('/useraccount/forgot').send({});

    expect(response.status).toBe(400);
    expect(harness.send).not.toHaveBeenCalled();
  });
});

describe('POST /useraccount/forgot - reset token lifetime', () => {
  it('expires after the intended lifetime and is valid before it', async () => {
    const harness = buildHarness();
    const before = Date.now();

    await request(harness.app).post('/useraccount/forgot').send({ email: KNOWN_EMAIL });

    const after = Date.now();
    const payload = sentPayload(harness.send);
    const token = tokenFromLink(payload.templateData.resetLink);
    const claims = decodeTokenPayload(token);

    // Unit contract: milliseconds since the epoch, not seconds. Every consumer
    // of this token compares it against Date.now() / moment(ms).
    expect(typeof claims.exp).toBe('number');
    expect(claims.exp).toBeGreaterThan(1e12);

    const expectedMin = before + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000;
    const expectedMax = after + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000;
    expect(claims.exp).toBeGreaterThanOrEqual(expectedMin - 1000);
    expect(claims.exp).toBeLessThanOrEqual(expectedMax + 1000);

    // Server rule (JWTStrategy): rejected once moment(exp) is in the past.
    const serverAccepts = (at: number) => !moment(claims.exp).isBefore(moment(at));
    expect(serverAccepts(claims.exp - 60 * 1000)).toBe(true);
    expect(serverAccepts(claims.exp + 60 * 1000)).toBe(false);

    // Client rule (PWA isTokenUsable): rejected once exp <= Date.now().
    const clientAccepts = (at: number) => claims.exp > at;
    expect(clientAccepts(claims.exp - 60 * 1000)).toBe(true);
    expect(clientAccepts(claims.exp + 60 * 1000)).toBe(false);

    // And specifically not the "instantly invalid" failure mode: a seconds
    // value would read as 1970 to both consumers.
    expect(serverAccepts(Date.now())).toBe(true);
    expect(clientAccepts(Date.now())).toBe(true);
  });
});

describe('POST /useraccount/forgot - reset link construction', () => {
  const expected = 'https://app.example.com/forgot-password?auth_token=token-123';

  it.each([
    ['https://app.example.com', '/forgot-password'],
    ['https://app.example.com/', '/forgot-password'],
    ['https://app.example.com', 'forgot-password'],
    ['https://app.example.com/', 'forgot-password'],
  ])('normalises siteUrl %s with route %s', (siteUrl, route) => {
    expect(buildPasswordResetLink(siteUrl, route, 'token-123')).toBe(expected);
  });

  it('produces a well-formed link at the route level for a trailing-slash siteUrl', async () => {
    const harness = buildHarness({ partner: makePartner({ siteUrl: 'https://app.example.com/' }) });

    await request(harness.app).post('/useraccount/forgot').send({ email: KNOWN_EMAIL });

    const link = sentPayload(harness.send).templateData.resetLink;
    expect(link.startsWith('https://app.example.com/forgot-password?auth_token=')).toBe(true);
    expect(link).not.toContain('//forgot-password');
    expect(link).not.toContain('comforgot-password');
  });

  it('produces a well-formed link at the route level for a route without a leading slash', async () => {
    const harness = buildHarness({ partner: makePartner({ resetEmailRoute: 'forgot-password' }) });

    await request(harness.app).post('/useraccount/forgot').send({ email: KNOWN_EMAIL });

    const link = sentPayload(harness.send).templateData.resetLink;
    expect(link.startsWith('https://app.example.com/forgot-password?auth_token=')).toBe(true);
    expect(link).not.toContain('comforgot-password');
  });
});

describe('POST /useraccount/forgot - delivery failures', () => {
  it('returns 500 and logs the provider error instead of swallowing it', async () => {
    const providerError = new Error('smtp provider unavailable');
    const harness = buildHarness({
      send: jest.fn().mockRejectedValue(providerError),
    });

    const response = await request(harness.app)
      .post('/useraccount/forgot')
      .send({ email: KNOWN_EMAIL });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('smtp provider unavailable');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to send forgot-password email via CommunicatorService',
      providerError,
    );
  });

  it('returns 500 and logs when the template cannot be resolved', async () => {
    const resolutionError = new Error('no template for purpose password_reset');
    const harness = buildHarness({
      resolveTemplate: jest.fn().mockRejectedValue(resolutionError),
    });

    const response = await request(harness.app)
      .post('/useraccount/forgot')
      .send({ email: KNOWN_EMAIL });

    expect(response.status).toBe(500);
    expect(harness.send).not.toHaveBeenCalled();

    // The resolver wraps a "no template" miss in its typed error, so the
    // provider-facing log carries that wrapped error, not the raw fixture.
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const [loggedMessage, loggedError] = mockLogger.error.mock.calls[0];
    expect(loggedMessage).toBe('Failed to send forgot-password email via CommunicatorService');
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toContain('password_reset');
  });
});
