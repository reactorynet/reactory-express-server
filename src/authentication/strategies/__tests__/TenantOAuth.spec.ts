/**
 * WP-A5: tenant-scoped OAuth strategies and state handling.
 *
 * Drives the real route handlers and real passport strategy instances; only
 * the tenant lookup, the IdP token exchange and the login-token minting are
 * stubbed, so no network is used.
 */

import passport from 'passport';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import TenantStrategyRegistry from '../TenantStrategyRegistry';
import { StateManager, VerifiedStateStore } from '../security';
import { beginTenantOAuth, completeTenantOAuth, isCallbackFailure } from '../tenantOAuth';
import { useOktaRoutes } from '../okta/OktaStrategy';
import GoogleOAuthStrategy, { useGoogleRoutes } from '../google/GoogleStrategy';
import { useGithubRoutes } from '../github/GithubStrategy';
import { microsoftIssuerOptions, microsoftCallbackPath } from '../microsoft/MicrosoftStrategy';
import Helpers from '../helpers';

const oktaTenant = (key: string, clientID: string, domain: string, extra: any = {}) => ({
  _id: { toString: () => `id-${key}` },
  key,
  siteUrl: `https://${key}.example.com`,
  auth_config: [
    {
      provider: 'okta',
      enabled: true,
      properties: { clientID, clientSecret: `${clientID}-secret`, domain, ...extra },
    },
  ],
});

const tenants: Record<string, any> = {
  'tenant-a': oktaTenant('tenant-a', 'client-a', 'a.okta.com'),
  'tenant-b': oktaTenant('tenant-b', 'client-b', 'b.okta.com'),
  'tenant-broken': {
    _id: { toString: () => 'id-broken' },
    key: 'tenant-broken',
    siteUrl: 'https://broken.example.com',
    auth_config: [{ provider: 'okta', enabled: true, properties: { clientID: 'only-an-id' } }],
  },
  'tenant-github': {
    _id: { toString: () => 'id-github' },
    key: 'tenant-github',
    siteUrl: 'https://github-tenant.example.com',
    auth_config: [
      { provider: 'github', enabled: true, properties: { clientID: 'gh-client', clientSecret: 'gh-secret' } },
    ],
  },
};

const mockTenantLookup = () =>
  jest.spyOn(ReactoryClient, 'findOne').mockImplementation(((query: any) => ({
    exec: jest.fn().mockResolvedValue(tenants[query.key] || null),
  })) as any);

const collectRoutes = (register: (app: any) => void) => {
  const routes: Record<string, Function> = {};
  const app: any = {
    get: jest.fn((path: string, handler: Function) => { routes[`GET ${path}`] = handler; }),
    post: jest.fn((path: string, handler: Function) => { routes[`POST ${path}`] = handler; }),
  };
  register(app);
  return routes;
};

/** A response double that captures passport's redirect (setHeader + end). */
const createRes = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    status: jest.fn(function (this: any, code: number) { this.statusCode = code; return this; }),
    send: jest.fn(function (this: any, body: any) { this.body = body; return this; }),
    json: jest.fn(function (this: any, body: any) { this.body = body; return this; }),
    setHeader: jest.fn(function (this: any, k: string, v: string) { this.headers[k.toLowerCase()] = v; }),
    end: jest.fn(),
    redirect: jest.fn(function (this: any, a: any, b?: any) {
      this.redirectedTo = typeof a === 'number' ? b : a;
    }),
    clearCookie: jest.fn(),
  };
  return res;
};

const createReq = (overrides: any = {}) => ({
  params: {},
  query: {},
  headers: {},
  session: {},
  context: {},
  ...overrides,
});

describe('WP-A5: tenant-scoped OAuth', () => {
  beforeEach(() => {
    TenantStrategyRegistry.clear();
    StateManager.clearAll();
    mockTenantLookup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TenantStrategyRegistry', () => {
    it('uses each env-backed strategy\'s own passport name as the default', () => {
      expect(TenantStrategyRegistry.defaultName('microsoft')).toBe('azuread-openidconnect');
      expect(TenantStrategyRegistry.defaultName('okta')).toBe('okta');
      expect(TenantStrategyRegistry.getStrategyName('microsoft', { key: 'plain', auth_config: [] }))
        .toBe('azuread-openidconnect');
    });

    it('fails closed when a tenant auth_config entry cannot build a strategy', () => {
      expect(TenantStrategyRegistry.getStrategyName('okta', tenants['tenant-broken'])).toBeNull();
    });

    it('rebuilds the tenant strategy when its configuration changes', () => {
      const tenant = oktaTenant('tenant-rotating', 'client-1', 'r.okta.com');
      const first = TenantStrategyRegistry.getOrCreate('okta', tenant).strategy as any;
      expect(first._oauth2._clientId).toBe('client-1');

      tenant.auth_config[0].properties.clientID = 'client-2';
      const second = TenantStrategyRegistry.getOrCreate('okta', tenant).strategy as any;
      expect(second).not.toBe(first);
      expect(second._oauth2._clientId).toBe('client-2');
      expect((passport as any)._strategy('okta:tenant-rotating')).toBe(second);
    });

    it.each([
      ['okta', { clientID: 'i', clientSecret: 's', domain: 'x.okta.com' }],
      ['microsoft', { clientID: 'i', clientSecret: 's', tenantId: '00000000-0000-0000-0000-000000000001' }],
      ['google', { clientID: 'i', clientSecret: 's' }],
      ['github', { clientID: 'i', clientSecret: 's' }],
      ['facebook', { clientID: 'i', clientSecret: 's' }],
      ['linkedin', { clientID: 'i', clientSecret: 's' }],
    ])('builds a %s strategy from tenant properties', (provider, properties) => {
      const partner = { key: `t-${provider}`, auth_config: [{ provider, enabled: true, properties }] };
      const { name, strategy } = TenantStrategyRegistry.getOrCreate(provider, partner);
      expect(name).toBe(`${provider}:t-${provider}`);
      expect(strategy).toBeTruthy();
      expect((passport as any)._strategy(name)).toBe(strategy);
    });
  });

  describe('Okta start route with two tenants', () => {
    const start = async (clientKey: string, viaQuery = false) => {
      const routes = collectRoutes(useOktaRoutes);
      const req = viaQuery
        ? createReq({ query: { 'x-client-key': clientKey } })
        : createReq({ params: { clientKey } });
      const res = createRes();
      const handler = viaQuery ? routes['GET /auth/okta/start'] : routes['GET /auth/okta/start/:clientKey'];
      await handler(req, res, jest.fn());
      return { req, res };
    };

    it.each([
      ['tenant-a', 'a.okta.com', 'client-a'],
      ['tenant-b', 'b.okta.com', 'client-b'],
    ])('redirects %s to its own issuer and client_id', async (key, domain, clientID) => {
      const { req, res } = await start(key);
      const location = new URL(res.headers.location);
      expect(location.host).toBe(domain);
      expect(location.pathname).toBe('/oauth2/v1/authorize');
      expect(location.searchParams.get('client_id')).toBe(clientID);
      // State is minted by StateManager and bound to this browser session.
      expect(location.searchParams.get('state')).toBe(req.session.authState);
    });

    it('accepts the tenant key as ?x-client-key= as sent by the login buttons', async () => {
      const { res } = await start('tenant-b', true);
      expect(new URL(res.headers.location).searchParams.get('client_id')).toBe('client-b');
    });

    it('answers 503 instead of falling back to the default app for a misconfigured tenant', async () => {
      const { res } = await start('tenant-broken');
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.headers.location).toBeUndefined();
    });
  });

  describe('Okta callback route', () => {
    it('completes login for the tenant named in the verified state', async () => {
      const routes = collectRoutes(useOktaRoutes);

      // Start the flow for tenant-a.
      const startReq = createReq({ params: { clientKey: 'tenant-a' } });
      await routes['GET /auth/okta/start/:clientKey'](startReq, createRes(), jest.fn());
      const state = startReq.session.authState;

      // Stub the IdP token exchange and profile fetch on the tenant strategy.
      const strategy: any = (passport as any)._strategy('okta:tenant-a');
      strategy._oauth2.getOAuthAccessToken = (_code: string, _params: any, cb: Function) =>
        cb(null, 'access-token', 'refresh-token', { id_token: 'id-token' });
      strategy.userProfile = (_token: string, done: Function) =>
        done(null, { id: 'okta-sub', displayName: 'A User', emails: [{ value: 'a.user@example.com' }] });

      const user: any = {
        _id: { toString: () => 'user-1' },
        email: 'a.user@example.com',
        authentications: [],
        memberships: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      const userService = { findUserWithEmail: jest.fn().mockResolvedValue(user), createUser: jest.fn() };
      jest.spyOn(Helpers, 'generateLoginToken').mockResolvedValue({ token: 'tenant-a-jwt' } as any);

      const callbackReq = createReq({
        query: { code: 'auth-code', state },
        session: startReq.session,
        context: { getService: () => userService, user: { _id: 'system' } },
      });
      const res = createRes();
      await routes['GET /auth/okta/callback'](callbackReq, res, jest.fn());
      await new Promise(resolve => setImmediate(resolve));

      expect(res.redirectedTo).toBe('https://tenant-a.example.com/?auth_token=tenant-a-jwt');
      expect(callbackReq.context.partner.key).toBe('tenant-a');
      expect(callbackReq.session.authState).toBeUndefined();
    });

    it('rejects a callback whose state does not match the session', async () => {
      const routes = collectRoutes(useOktaRoutes);
      const startReq = createReq({ params: { clientKey: 'tenant-a' } });
      await routes['GET /auth/okta/start/:clientKey'](startReq, createRes(), jest.fn());

      // A different browser (no session state) replays the callback URL.
      const res = createRes();
      await routes['GET /auth/okta/callback'](
        createReq({ query: { code: 'c', state: startReq.session.authState }, session: {} }),
        res,
        jest.fn(),
      );
      expect(res.redirectedTo).toBe('/auth/okta/failure?error=state_mismatch');
    });
  });

  describe('completeTenantOAuth', () => {
    const begin = async (provider: string, clientKey: string) => {
      const req = createReq({ query: { 'x-client-key': clientKey } });
      const begun = await beginTenantOAuth(req, createRes(), provider);
      return { req, begun };
    };

    it('reports a missing state', async () => {
      const result = await completeTenantOAuth(createReq(), 'okta');
      expect(isCallbackFailure(result) && result.error).toBe('missing_state');
    });

    it('consumes the state: a replay with the same session fails', async () => {
      const { req } = await begin('okta', 'tenant-a');
      const state = req.session.authState;
      const session = { authState: state };

      const first = await completeTenantOAuth(createReq({ query: { state }, session }), 'okta');
      expect(isCallbackFailure(first)).toBe(false);

      session.authState = state;
      const replay = await completeTenantOAuth(createReq({ query: { state }, session }), 'okta');
      expect(isCallbackFailure(replay) && replay.error).toBe('invalid_state');
    });

    it('refuses a state minted for a different provider', async () => {
      const { req } = await begin('okta', 'tenant-a');
      const state = req.session.authState;
      const result = await completeTenantOAuth(createReq({ query: { state }, session: { authState: state } }), 'github');
      expect(isCallbackFailure(result) && result.error).toBe('invalid_state');
    });

    it('exposes the verified state to VerifiedStateStore', async () => {
      const { req } = await begin('okta', 'tenant-a');
      const state = req.session.authState;
      const callbackReq: any = createReq({ query: { state }, session: { authState: state } });
      await completeTenantOAuth(callbackReq, 'okta');

      const store = new VerifiedStateStore();
      const ok = jest.fn();
      store.verify(callbackReq, state, {}, ok);
      expect(ok).toHaveBeenCalledWith(null, true);

      const bad = jest.fn();
      store.verify(callbackReq, 'forged', {}, bad);
      expect(bad).toHaveBeenCalledWith(null, false, expect.anything());
    });
  });

  describe('session-based providers', () => {
    it('GitHub start uses the tenant strategy and binds state to the session', async () => {
      const routes = collectRoutes(useGithubRoutes);
      const req = createReq({ query: { 'x-client-key': 'tenant-github' } });
      const res = createRes();
      await routes['GET /auth/github/start'](req, res, jest.fn());

      const location = new URL(res.headers.location);
      expect(location.host).toBe('github.com');
      expect(location.searchParams.get('client_id')).toBe('gh-client');
      expect(location.searchParams.get('state')).toBe(req.session.authState);
    });

    it('Google callback rejects a state that is not the session copy (CSRF)', async () => {
      const routes = collectRoutes(useGoogleRoutes);
      const res = createRes();
      await routes['GET /auth/google/callback'](
        createReq({ query: { code: 'c', state: 'attacker-state' }, session: { authState: 'victim-state' } }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.reason).toBe('state_mismatch');
    });

    it('Google start mints a StateManager state for the tenant', async () => {
      // tenant-a has no Google auth_config, so the env-backed default is used.
      passport.use(GoogleOAuthStrategy);
      const routes = collectRoutes(useGoogleRoutes);
      const req = createReq({ query: { 'x-client-key': 'tenant-a' } });
      const res = createRes();
      await routes['GET /auth/google/start'](req, res, jest.fn());

      const location = new URL(res.headers.location);
      expect(location.searchParams.get('state')).toBe(req.session.authState);
      const decoded = JSON.parse(Buffer.from(req.session.authState, 'base64').toString('utf-8'));
      expect(decoded.data).toEqual(expect.objectContaining({ 'x-client-key': 'tenant-a', flow: 'google' }));
      expect(decoded.data['x-client-pwd']).toBeUndefined();
    });
  });

  describe('Microsoft helpers (WP-A6 item 1)', () => {
    it('validates the issuer for a specific Azure AD tenant', () => {
      expect(microsoftIssuerOptions('11111111-2222-3333-4444-555555555555')).toEqual({
        validateIssuer: true,
        issuer: 'https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0',
      });
    });

    it.each(['common', 'organizations', 'consumers'])('keeps issuer validation off for %s', (authority) => {
      expect(microsoftIssuerOptions(authority)).toEqual({ validateIssuer: false });
    });

    it('mounts the callback on the redirect URI path, not the full URL', () => {
      expect(microsoftCallbackPath('https://api.example.com/auth/microsoft/openid/complete/'))
        .toBe('/auth/microsoft/openid/complete/');
      expect(microsoftCallbackPath('/auth/microsoft/openid/complete')).toBe('/auth/microsoft/openid/complete/');
    });
  });
});
