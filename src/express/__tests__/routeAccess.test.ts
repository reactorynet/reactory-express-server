import {
  DEFAULT_ROUTE_ACCESS_POLICIES,
  DEVELOPMENT_ROUTE_ACCESS_POLICIES,
  defaultRouteAccessPolicies,
  evaluateRouteAccess,
  isIpAllowed,
  matchRoutePolicy,
  parseRouteAccessSeed,
  clientIp,
  clearRouteAccessCache,
  getRouteAccessPolicies,
  IReactoryRouteAccessPolicy,
} from '../routeAccess';

/**
 * A client config with a deliberately public route (the PayU callback), so the
 * server-wide union can be exercised: a webhook carries no tenant key, so the
 * tenant-scoped lookup never runs for it.
 */
jest.mock('@reactory/server-core/data/clientConfigs', () => ({
  __esModule: true,
  default: [
    {
      key: 'reactory',
      settings: [
        {
          name: 'routeAccess',
          data: [
            {
              path: '/api/payment/v1/webhooks/',
              methods: ['POST'],
              tenantAuth: false,
              cors: false,
              ipAllowList: ['41.0.0.0/8'],
              description: 'PayU IPN callback',
            },
          ],
        },
      ],
    },
    {
      key: 'other-tenant',
      settings: [
        {
          name: 'routeAccess',
          data: [{ path: '/api/hooks/partner', tenantAuth: false }],
        },
      ],
    },
  ],
}));

/**
 * The policy engine is the single decision point for "may this request skip tenant
 * auth / CORS, and is this IP allowed". It replaces two hardwired `bypassUri` arrays
 * that were matched with a loose `path.includes()`. These tests pin both the new
 * expressiveness and the behaviour preservation.
 */
describe('route access — default policies reproduce the previous bypass list', () => {
  const policies = defaultRouteAccessPolicies('production');

  it.each([
    '/cdn/content/logo.png',
    '/cdn/themes/dark.css',
    '/favicon.ico',
    '/login',
    '/logout',
    '/health',
    '/health/ready',
    '/telemetry/baggage',
    '/auth/google/start',
    '/auth/microsoft/callback',
  ])('exempts %s from tenant auth', (path) => {
    expect(evaluateRouteAccess({ path }, policies).tenantAuthRequired).toBe(false);
  });

  it('does NOT exempt the payment webhook by default', () => {
    // Nothing in the built-in list may open a money-bearing route implicitly.
    const decision = evaluateRouteAccess({ path: '/api/payment/v1/webhooks/payu', method: 'POST' }, policies);
    expect(decision.tenantAuthRequired).toBe(true);
  });

  it('adds dev-only routes outside production, not in it', () => {
    const prod = defaultRouteAccessPolicies('production').map((p) => p.path);
    const dev = defaultRouteAccessPolicies('development').map((p) => p.path);
    expect(prod).not.toContain('/swagger');
    expect(dev).toContain('/swagger');
    expect(DEVELOPMENT_ROUTE_ACCESS_POLICIES.length).toBeGreaterThan(0);
  });

  it('keeps unmapped paths fully protected', () => {
    const decision = evaluateRouteAccess({ path: '/graphql' }, policies);
    expect(decision).toMatchObject({ tenantAuthRequired: true, corsRequired: true, ipAllowed: true });
    expect(decision.policy).toBeUndefined();
  });
});

describe('route access — path matching', () => {
  it('matches on a path boundary, not a substring', () => {
    // The old `includes()` let `/api/login-ish` skip auth via `/login`.
    expect(matchRoutePolicy(DEFAULT_ROUTE_ACCESS_POLICIES, '/login')).toBeDefined();
    expect(matchRoutePolicy(DEFAULT_ROUTE_ACCESS_POLICIES, '/login/callback')).toBeDefined();
    expect(matchRoutePolicy(DEFAULT_ROUTE_ACCESS_POLICIES, '/api/login-ish')).toBeUndefined();
    expect(matchRoutePolicy(DEFAULT_ROUTE_ACCESS_POLICIES, '/healthz')).toBeUndefined();
  });

  it('ignores the query string', () => {
    // A bypass path inside a query string must not exempt the request.
    expect(matchRoutePolicy(DEFAULT_ROUTE_ACCESS_POLICIES, '/graphql?x=/login')).toBeUndefined();
    expect(matchRoutePolicy(DEFAULT_ROUTE_ACCESS_POLICIES, '/login?next=/x')).toBeDefined();
  });

  it('prefers the longest matching prefix', () => {
    const policies: IReactoryRouteAccessPolicy[] = [
      { path: '/api/payment', tenantAuth: true },
      { path: '/api/payment/v1/webhooks/', tenantAuth: false, ipAllowList: ['41.0.0.0/8'] },
    ];
    const decision = evaluateRouteAccess({ path: '/api/payment/v1/webhooks/payu', ip: '41.1.2.3' }, policies);
    expect(decision.matchedPath).toBe('/api/payment/v1/webhooks/');
    expect(decision.tenantAuthRequired).toBe(false);
    expect(decision.ipAllowed).toBe(true);
  });

  it('scopes by method when the policy asks', () => {
    const policies: IReactoryRouteAccessPolicy[] = [
      { path: '/api/hook', methods: ['POST'], tenantAuth: false },
    ];
    expect(evaluateRouteAccess({ path: '/api/hook', method: 'POST' }, policies).tenantAuthRequired).toBe(false);
    expect(evaluateRouteAccess({ path: '/api/hook', method: 'GET' }, policies).tenantAuthRequired).toBe(true);
  });

  it('prefers a method-scoped policy over an unscoped one of equal length', () => {
    const policies: IReactoryRouteAccessPolicy[] = [
      { path: '/api/hook', tenantAuth: true },
      { path: '/api/hook', methods: ['POST'], tenantAuth: false },
    ];
    expect(evaluateRouteAccess({ path: '/api/hook', method: 'POST' }, policies).tenantAuthRequired).toBe(false);
    expect(evaluateRouteAccess({ path: '/api/hook', method: 'GET' }, policies).tenantAuthRequired).toBe(true);
  });
});

describe('route access — IP allow-lists', () => {
  it('treats an empty or missing list as unrestricted', () => {
    expect(isIpAllowed('1.2.3.4', undefined)).toBe(true);
    expect(isIpAllowed('1.2.3.4', [])).toBe(true);
  });

  it('allows any IP with *', () => {
    expect(isIpAllowed('203.0.113.9', ['*'])).toBe(true);
  });

  it('matches exact addresses', () => {
    expect(isIpAllowed('41.1.2.3', ['41.1.2.3'])).toBe(true);
    expect(isIpAllowed('41.1.2.4', ['41.1.2.3'])).toBe(false);
  });

  it('matches IPv4 CIDR ranges', () => {
    const list = ['41.0.0.0/8', '196.44.0.0/16'];
    expect(isIpAllowed('41.9.9.9', list)).toBe(true);
    expect(isIpAllowed('196.44.7.1', list)).toBe(true);
    expect(isIpAllowed('196.45.7.1', list)).toBe(false);
    expect(isIpAllowed('8.8.8.8', list)).toBe(false);
  });

  it('handles the CIDR edges', () => {
    expect(isIpAllowed('1.2.3.4', ['0.0.0.0/0'])).toBe(true); // all IPv4
    expect(isIpAllowed('1.2.3.4', ['1.2.3.4/32'])).toBe(true);
    expect(isIpAllowed('1.2.3.5', ['1.2.3.4/32'])).toBe(false);
  });

  it('unwraps IPv6-mapped IPv4 addresses', () => {
    expect(isIpAllowed('::ffff:41.1.2.3', ['41.0.0.0/8'])).toBe(true);
  });

  it('does not let an unknown/empty IP pass a restrictive list', () => {
    expect(isIpAllowed(undefined, ['41.0.0.0/8'])).toBe(false);
    expect(isIpAllowed('', ['41.0.0.0/8'])).toBe(false);
  });

  it('does not silently accept an IPv6 CIDR it cannot evaluate', () => {
    // Better to deny than to pretend a range was checked.
    expect(isIpAllowed('2001:db8::1', ['2001:db8::/32'])).toBe(false);
  });

  it('enforces the allow-list independently of tenantAuth', () => {
    const policies: IReactoryRouteAccessPolicy[] = [
      { path: '/api/payment/v1/webhooks/', methods: ['POST'], tenantAuth: false, cors: false, ipAllowList: ['41.0.0.0/8'] },
    ];
    const allowed = evaluateRouteAccess({ path: '/api/payment/v1/webhooks/payu', method: 'POST', ip: '41.1.1.1' }, policies);
    expect(allowed).toMatchObject({ tenantAuthRequired: false, corsRequired: false, ipAllowed: true });

    const denied = evaluateRouteAccess({ path: '/api/payment/v1/webhooks/payu', method: 'POST', ip: '8.8.8.8' }, policies);
    expect(denied.ipAllowed).toBe(false);
  });
});

describe('route access — configuration', () => {
  it('parses a JSON seed array', () => {
    const seed = parseRouteAccessSeed(
      JSON.stringify([{ path: '/api/payment/v1/webhooks/', tenantAuth: false, ipAllowList: ['41.0.0.0/8'] }]),
    );
    expect(seed).toHaveLength(1);
    expect(seed[0].ipAllowList).toEqual(['41.0.0.0/8']);
  });

  it('ignores a malformed seed rather than throwing', () => {
    expect(parseRouteAccessSeed('not json')).toEqual([]);
    expect(parseRouteAccessSeed('{"path":"/x"}')).toEqual([]); // not an array
    expect(parseRouteAccessSeed(JSON.stringify([{ tenantAuth: false }]))).toEqual([]); // no path
    expect(parseRouteAccessSeed(undefined)).toEqual([]);
  });
});

describe('route access — client IP extraction', () => {
  it('prefers x-forwarded-for and takes the first hop', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '41.1.1.1, 10.0.0.1' } })).toBe('41.1.1.1');
  });

  it('falls back through x-real-ip, req.ip and the socket', () => {
    expect(clientIp({ headers: { 'x-real-ip': '41.2.2.2' } })).toBe('41.2.2.2');
    expect(clientIp({ headers: {}, ip: '41.3.3.3' })).toBe('41.3.3.3');
    expect(clientIp({ headers: {}, socket: { remoteAddress: '41.4.4.4' } })).toBe('41.4.4.4');
  });

  it('returns undefined when nothing is available', () => {
    expect(clientIp({ headers: {} })).toBeUndefined();
  });
});

describe('route access — synchronous resolution (the request path)', () => {
  const ORIGINAL_SEED = process.env.REACTORY_ROUTE_ACCESS;
  afterEach(() => {
    clearRouteAccessCache();
    if (ORIGINAL_SEED === undefined) delete process.env.REACTORY_ROUTE_ACCESS;
    else process.env.REACTORY_ROUTE_ACCESS = ORIGINAL_SEED;
  });

  it('is synchronous — the middleware may not await a database', () => {
    const result = getRouteAccessPolicies();
    expect(Array.isArray(result)).toBe(true);
    // A promise here would put a DB read on every request — and hung the CORS
    // delegate in tests, which is exactly what happened the first time round.
    expect(typeof (result as any).then).toBe('undefined');
  });

  it('returns the defaults with no configuration', () => {
    const paths = getRouteAccessPolicies().map((policy) => policy.path);
    expect(paths).toContain('/login');
    expect(paths).toContain('/health');
  });

  it('merges the REACTORY_ROUTE_ACCESS seed', () => {
    process.env.REACTORY_ROUTE_ACCESS = JSON.stringify([
      { path: '/api/payment/v1/webhooks/', methods: ['POST'], tenantAuth: false, ipAllowList: ['41.0.0.0/8'] },
    ]);
    const decision = evaluateRouteAccess(
      { path: '/api/payment/v1/webhooks/payu', method: 'POST', ip: '41.1.1.1' },
      getRouteAccessPolicies(),
    );
    expect(decision.tenantAuthRequired).toBe(false);
    expect(decision.ipAllowed).toBe(true);
  });

  it('caches per tenant and refetches only after the cache is cleared', () => {
    const first = getRouteAccessPolicies('tenant-x');
    const second = getRouteAccessPolicies('tenant-x');
    expect(second).toBe(first); // same reference — served from cache

    clearRouteAccessCache('tenant-x');
    expect(getRouteAccessPolicies('tenant-x')).not.toBe(first);
  });

  it('applies a tenant-less request to the union of every enabled client', () => {
    // THE PayU CASE: no tenant key, so the tenant-scoped lookup cannot run. The
    // public route comes from the client config union, not from the defaults.
    const decision = evaluateRouteAccess(
      { path: '/api/payment/v1/webhooks/payu', method: 'POST', ip: '41.1.2.3' },
      getRouteAccessPolicies(),
    );
    expect(decision.tenantAuthRequired).toBe(false);
    expect(decision.corsRequired).toBe(false);
    expect(decision.ipAllowed).toBe(true);
    expect(decision.matchedPath).toBe('/api/payment/v1/webhooks/');
  });

  it('still enforces the allow-list for a tenant-less request', () => {
    const decision = evaluateRouteAccess(
      { path: '/api/payment/v1/webhooks/payu', method: 'POST', ip: '8.8.8.8' },
      getRouteAccessPolicies(),
    );
    expect(decision.tenantAuthRequired).toBe(false);
    expect(decision.ipAllowed).toBe(false);
  });

  it('unions exemptions from every client, not just the first', () => {
    const paths = getRouteAccessPolicies('other-tenant').map((policy) => policy.path);
    expect(paths).toContain('/api/hooks/partner');
  });
});
