/**
 * POST /useraccount/forgot returns a link, but until now there was no endpoint
 * that would accept it: the router served /register, /forgot and two activation
 * GETs. `UserService.setUserPassword` existed but required an authenticated
 * caller, so a person who was locked out had nothing to call. The mailed token
 * was also signed with `Helpers.jwtMake`, i.e. with the *session* secret, so it
 * doubled as a Bearer token.
 *
 * These tests cover the reset endpoints and the token contract behind them.
 */

import express from 'express';
import request from 'supertest';
import jwt from 'jwt-simple';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import UserAccountRouter, {
  MIN_PASSWORD_LENGTH,
  RESET_TOKEN_SCOPE,
  RESET_TOKEN_SECRET_SUFFIX,
  RESET_PASSWORD_MESSAGES,
  RESET_PASSWORD_ROUTE_DEFAULT,
  createPasswordResetToken,
  inspectPasswordResetToken,
  passwordFingerprint,
  resolvePasswordResetRoute,
  resolveResetSigningSecret,
} from '../UserAccount';

const SECRET_SAUCE = 'test-secret-sauce';

/** The stored hash the token is bound to. */
const CURRENT_HASH = 'pbkdf2$sha512$600000$abc$def';

const buildUser = (overrides: any = {}) => ({
  _id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  avatar: 'https://example.com/ada.png',
  password: CURRENT_HASH,
  ...overrides,
});

interface IHarnessOptions {
  user?: any;
  setUserPassword?: jest.Mock;
}

const buildHarness = (options: IHarnessOptions = {}) => {
  const user = options.user === undefined ? buildUser() : options.user;
  const setUserPassword =
    options.setUserPassword ?? jest.fn().mockResolvedValue(buildUser());

  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.context = {
      getService: (id: string) => {
        if (id === 'core.UserService@1.0.0') {
          return {
            findUserById: jest.fn(async () => user),
            findUserWithEmail: jest.fn(async () => user),
            setUserPassword,
          };
        }
        throw new Error('Unexpected service requested: ' + id);
      },
    };
    next();
  });
  app.use('/useraccount', UserAccountRouter);

  return { app, setUserPassword, user };
};

const mintToken = (user: any = buildUser()) =>
  createPasswordResetToken(user, { _id: 'partner-1' }).token;

beforeEach(() => {
  process.env.SECRET_SAUCE = SECRET_SAUCE;
  jest.clearAllMocks();
});

describe('password reset token', () => {
  it('is signed with a purpose-scoped key, not the session secret', () => {
    const token = mintToken();

    // Decodable with the reset key ...
    expect(() => jwt.decode(token, resolveResetSigningSecret())).not.toThrow();

    // ... and NOT with the raw session secret. This is what stops a reset link
    // from being usable as a Bearer token.
    expect(() => jwt.decode(token, SECRET_SAUCE)).toThrow();
  });

  it('carries the reset scope and the password fingerprint', () => {
    const claims: any = jwt.decode(mintToken(), resolveResetSigningSecret());

    expect(claims.scope).toBe(RESET_TOKEN_SCOPE);
    expect(claims.pwfp).toBe(passwordFingerprint(CURRENT_HASH));
    expect(claims.userId).toBe('user-1');
  });

  it('rejects a token minted with the session secret', () => {
    const foreign = jwt.encode({ scope: RESET_TOKEN_SCOPE, userId: 'user-1', exp: Date.now() + 60000 }, SECRET_SAUCE);

    expect(inspectPasswordResetToken(foreign).state).toBe('invalid');
  });

  it('rejects a token with the wrong scope', () => {
    const wrongScope = jwt.encode(
      { scope: 'account_activation', userId: 'user-1', pwfp: 'x', exp: Date.now() + 60000 },
      resolveResetSigningSecret(),
    );

    expect(inspectPasswordResetToken(wrongScope)).toMatchObject({
      state: 'invalid',
      reason: 'wrong_scope',
    });
  });

  it('reports expiry rather than malformed', () => {
    const expired = jwt.encode(
      { scope: RESET_TOKEN_SCOPE, userId: 'user-1', pwfp: 'x', exp: Date.now() - 1000 },
      resolveResetSigningSecret(),
    );

    expect(inspectPasswordResetToken(expired).state).toBe('expired');
  });

  it('fails closed when SECRET_SAUCE is not set', () => {
    delete process.env.SECRET_SAUCE;

    expect(() => resolveResetSigningSecret()).toThrow(/SECRET_SAUCE is not set/);
  });
});

describe('GET /useraccount/reset-password', () => {
  it('describes the target account for a valid token', async () => {
    const { app } = buildHarness();

    const response = await request(app)
      .get('/useraccount/reset-password')
      .query({ token: mintToken() });

    expect(response.status).toBe(200);
    expect(response.body.state).toBe('valid');
    expect(response.body.user).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      avatar: 'https://example.com/ada.png',
    });
  });

  it('never leaks the password hash or salt', async () => {
    const { app } = buildHarness();

    const response = await request(app)
      .get('/useraccount/reset-password')
      .query({ token: mintToken() });

    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.salt).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('pbkdf2');
  });

  it('400s when the token is missing', async () => {
    const { app } = buildHarness();

    const response = await request(app).get('/useraccount/reset-password');

    expect(response.status).toBe(400);
    expect(response.body.state).toBe('missing_token');
    expect(response.body.message).toBe(RESET_PASSWORD_MESSAGES.missing);
  });

  it('400s on a malformed token', async () => {
    const { app } = buildHarness();

    const response = await request(app)
      .get('/useraccount/reset-password')
      .query({ token: 'not-a-jwt' });

    expect(response.status).toBe(400);
    expect(response.body.state).toBe('invalid_token');
  });

  it('410s on an expired token', async () => {
    const { app } = buildHarness();
    const expired = jwt.encode(
      { scope: RESET_TOKEN_SCOPE, userId: 'user-1', pwfp: passwordFingerprint(CURRENT_HASH), exp: Date.now() - 1000 },
      resolveResetSigningSecret(),
    );

    const response = await request(app)
      .get('/useraccount/reset-password')
      .query({ token: expired });

    expect(response.status).toBe(410);
    expect(response.body.state).toBe('expired_token');
  });

  it('410s on a token that has already been used', async () => {
    // The user's hash has moved on since the token was minted.
    const token = mintToken();
    const { app } = buildHarness({ user: buildUser({ password: 'pbkdf2$sha512$new$hash' }) });

    const response = await request(app)
      .get('/useraccount/reset-password')
      .query({ token });

    expect(response.status).toBe(410);
    expect(response.body.state).toBe('used_token');
  });

  it('400s like a malformed token when the account no longer exists', async () => {
    const { app } = buildHarness({ user: null });

    const response = await request(app)
      .get('/useraccount/reset-password')
      .query({ token: mintToken() });

    expect(response.status).toBe(400);
    expect(response.body.state).toBe('invalid_token');
  });
});

describe('POST /useraccount/reset-password', () => {
  it('sets the password and clears existing sessions', async () => {
    const { app, setUserPassword } = buildHarness();
    const token = mintToken();

    const response = await request(app)
      .post('/useraccount/reset-password')
      .send({ token, password: 'correct horse battery', confirmPassword: 'correct horse battery' });

    expect(response.status).toBe(200);
    expect(response.body.state).toBe('completed');
    expect(setUserPassword).toHaveBeenCalledWith(
      'user-1',
      'correct horse battery',
      token,
      { clearSessions: true },
    );
  });

  it('rejects a password shorter than the minimum', async () => {
    const { app, setUserPassword } = buildHarness();

    const response = await request(app)
      .post('/useraccount/reset-password')
      .send({ token: mintToken(), password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.state).toBe('weak_password');
    expect(setUserPassword).not.toHaveBeenCalled();
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThan(7);
  });

  it('rejects a missing password', async () => {
    const { app, setUserPassword } = buildHarness();

    const response = await request(app)
      .post('/useraccount/reset-password')
      .send({ token: mintToken() });

    expect(response.status).toBe(400);
    expect(setUserPassword).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match', async () => {
    const { app, setUserPassword } = buildHarness();

    const response = await request(app)
      .post('/useraccount/reset-password')
      .send({ token: mintToken(), password: 'correct horse battery', confirmPassword: 'different' });

    expect(response.status).toBe(400);
    expect(response.body.state).toBe('password_mismatch');
    expect(setUserPassword).not.toHaveBeenCalled();
  });

  it('refuses a reused token, and does not touch the password', async () => {
    const token = mintToken();
    const { app, setUserPassword } = buildHarness({
      user: buildUser({ password: 'pbkdf2$sha512$changed$hash' }),
    });

    const response = await request(app)
      .post('/useraccount/reset-password')
      .send({ token, password: 'correct horse battery' });

    expect(response.status).toBe(410);
    expect(response.body.state).toBe('used_token');
    expect(setUserPassword).not.toHaveBeenCalled();
  });

  it('does not reveal the service error to the caller', async () => {
    const { app } = buildHarness({
      setUserPassword: jest.fn().mockRejectedValue(new Error('mongo exploded: secret detail')),
    });

    const response = await request(app)
      .post('/useraccount/reset-password')
      .send({ token: mintToken(), password: 'correct horse battery' });

    expect(response.status).toBe(500);
    expect(response.body.state).toBe('failed');
    expect(JSON.stringify(response.body)).not.toContain('mongo exploded');
  });
});

describe('reset link target', () => {
  it('defaults to the route the client serves for the reset form', () => {
    expect(resolvePasswordResetRoute({})).toBe(RESET_PASSWORD_ROUTE_DEFAULT);
    expect(RESET_PASSWORD_ROUTE_DEFAULT).toBe('/reset-password');
  });

  it('prefers an explicit resetPasswordRoute', () => {
    expect(resolvePasswordResetRoute({ resetPasswordRoute: '/account/new-password' })).toBe(
      '/account/new-password',
    );
  });

  it('honours the application setting over the legacy field', () => {
    const partner = {
      resetEmailRoute: '/forgot-password',
      getSetting: () => ({ data: '/account/reset' }),
    };

    expect(resolvePasswordResetRoute(partner)).toBe('/account/reset');
  });

  it('falls back to the legacy resetEmailRoute when nothing else is set', () => {
    // `data: undefined` needs the annotation: without it the property is typed
    // `any`, which the repository typecheck ratchet reports as a new error
    // (TS7018). Type-only; the fixture value is unchanged.
    const partner = {
      resetEmailRoute: '/reset-password',
      getSetting: () => ({ data: undefined as string | undefined }),
    };

    expect(resolvePasswordResetRoute(partner)).toBe('/reset-password');
  });
});

/** Guards the ordering the suffix exists for. */
describe('reset token key derivation', () => {
  it('is a distinct key from the session secret', () => {
    expect(resolveResetSigningSecret()).toBe(`${SECRET_SAUCE}${RESET_TOKEN_SECRET_SUFFIX}`);
    expect(resolveResetSigningSecret()).not.toBe(SECRET_SAUCE);
  });
});
