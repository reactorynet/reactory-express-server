import CorsDelegate, { tenantWhitelistCache, clearTenantWhitelistCache } from '../cors';

describe('WP-A3: Tenant-scoped CORS', () => {
  beforeEach(() => {
    clearTenantWhitelistCache();
    process.env.REACTORY_APP_WHITELIST = 'https://global-admin.com,https://api.reactory.net';

    // Seed two tenants into tenantWhitelistCache
    tenantWhitelistCache['tenant-a'] = {
      whitelist: ['https://tenant-a.com', 'https://portal.tenant-a.com'],
      timestamp: Date.now(),
    };
    tenantWhitelistCache['tenant-b'] = {
      whitelist: ['https://tenant-b.com'],
      timestamp: Date.now(),
    };
  });

  afterEach(() => {
    clearTenantWhitelistCache();
  });

  const runCors = (req: any, origin: string): Promise<{ allowed: boolean; error?: Error }> => {
    return new Promise((resolve) => {
      CorsDelegate(req, (err, options) => {
        if (typeof options.origin === 'function') {
          (options.origin as any)(origin, (originErr: Error | null, allowed: boolean) => {
            resolve({ allowed: !!allowed, error: originErr || undefined });
          });
        } else {
          resolve({ allowed: false });
        }
      });
    });
  };

  it('allows an origin whitelisted for tenant-a on a request for tenant-a', async () => {
    const req: any = {
      headers: { 'x-client-key': 'tenant-a' },
      query: {},
      params: {},
      url: '/graphql',
      method: 'POST',
    };

    const result = await runCors(req, 'https://tenant-a.com');
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects an origin whitelisted for tenant-b on a request for tenant-a (cross-tenant leak prevented)', async () => {
    const req: any = {
      headers: { 'x-client-key': 'tenant-a' },
      query: {},
      params: {},
      url: '/graphql',
      method: 'POST',
    };

    const result = await runCors(req, 'https://tenant-b.com');
    expect(result.allowed).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toMatch(/not allowed by CORS whitelist/);
  });

  it('allows an origin whitelisted for tenant-b on a request for tenant-b', async () => {
    const req: any = {
      headers: { 'x-client-key': 'tenant-b' },
      query: {},
      params: {},
      url: '/graphql',
      method: 'POST',
    };

    const result = await runCors(req, 'https://tenant-b.com');
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('allows global whitelist origins for any tenant', async () => {
    const reqA: any = {
      headers: { 'x-client-key': 'tenant-a' },
      query: {},
      params: {},
      url: '/graphql',
      method: 'POST',
    };
    const reqB: any = {
      headers: { 'x-client-key': 'tenant-b' },
      query: {},
      params: {},
      url: '/graphql',
      method: 'POST',
    };

    const resultA = await runCors(reqA, 'https://global-admin.com');
    expect(resultA.allowed).toBe(true);

    const resultB = await runCors(reqB, 'https://global-admin.com');
    expect(resultB.allowed).toBe(true);
  });

  it('resolves tenant key from query parameter on preflight OPTIONS', async () => {
    const req: any = {
      headers: {},
      query: { 'x-client-key': 'tenant-a' },
      params: {},
      url: '/graphql?x-client-key=tenant-a',
      method: 'OPTIONS',
    };

    const result = await runCors(req, 'https://tenant-a.com');
    expect(result.allowed).toBe(true);

    const resultB = await runCors(req, 'https://tenant-b.com');
    expect(resultB.allowed).toBe(false);
  });

  it('allows requests without origin header (e.g. server-to-server or mobile)', async () => {
    const req: any = {
      headers: { 'x-client-key': 'tenant-a' },
      query: {},
      params: {},
      url: '/graphql',
      method: 'POST',
    };

    const result = await runCors(req, '');
    expect(result.allowed).toBe(true);
  });

  it('rejects unknown origins on requests without resolvable tenant', async () => {
    const req: any = {
      headers: {},
      query: {},
      params: {},
      url: '/api/public',
      method: 'POST',
    };

    const result = await runCors(req, 'https://unknown-hacker.com');
    expect(result.allowed).toBe(false);
  });

  it('allows global whitelist on requests without resolvable tenant', async () => {
    const req: any = {
      headers: {},
      query: {},
      params: {},
      url: '/api/public',
      method: 'POST',
    };

    const result = await runCors(req, 'https://global-admin.com');
    expect(result.allowed).toBe(true);
  });
});
