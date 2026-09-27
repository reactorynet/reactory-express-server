/**
 * WP-A6 hardening items and the Track A follow-ups that sit in middleware:
 *
 * - SECRET_SAUCE startup gate (item 4)
 * - TRUST_PROXY parsing for req.ip (item 5)
 * - CORS rejection answered with 403, not 500 (WP-A3 follow-up)
 * - Tenant middleware bypass matches the path only (query-string bypass)
 * - Anonymous account seeds never use a literal default password (item 2)
 */

import { JWTValidator } from '@reactory/server-core/authentication/strategies/security';
import { resolveTrustProxy, ReactoryCorsHandler } from '../ReactoryCors';
import { ReactoryClientAuthenticationMiddleware } from '../ReactoryClient';
import { clearTenantWhitelistCache } from '../../cors';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import {
  anonymousAccountSeeds,
  ANONYMOUS_PASSWORD_ENV,
} from '@reactory/server-core/authentication/password/anonymousAccounts';

const STRONG = 'x'.repeat(48);

describe('WP-A6 item 4: SECRET_SAUCE startup gate', () => {
  it('is skipped under NODE_ENV=test', () => {
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV: 'test' })).not.toThrow();
  });

  it.each(['production', 'development', 'local', ''])('refuses to start without a secret (NODE_ENV=%s)', (NODE_ENV) => {
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV })).toThrow(/SECURITY ERROR: SECRET_SAUCE is not set/);
  });

  it('refuses a well-known placeholder', () => {
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV: 'development', SECRET_SAUCE: 'secret' }))
      .toThrow(/placeholder/);
  });

  it('refuses a short secret in production', () => {
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV: 'production', SECRET_SAUCE: 'short-but-not-a-default' }))
      .toThrow(/at least 32/);
  });

  it('only warns about a short secret in development and local', () => {
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV: 'development', SECRET_SAUCE: 'short-but-not-a-default' }))
      .not.toThrow();
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV: 'local', SECRET_SAUCE: 'short-but-not-a-default' }))
      .not.toThrow();
  });

  it('accepts a 32+ byte secret everywhere', () => {
    expect(() => JWTValidator.enforceAtStartup({ NODE_ENV: 'production', SECRET_SAUCE: STRONG })).not.toThrow();
  });
});

describe('WP-A6 item 5: TRUST_PROXY', () => {
  it.each([
    [undefined, 1],
    ['', 1],
    ['false', false],
    ['true', true],
    ['2', 2],
    ['0', 0],
    ['10.0.0.0/8,loopback', '10.0.0.0/8,loopback'],
  ])('maps %p to %p', (value, expected) => {
    expect(resolveTrustProxy(value as any)).toEqual(expected);
  });
});

describe('Tenant-scoped CORS rejection', () => {
  const originalWhitelist = process.env.REACTORY_APP_WHITELIST;

  beforeEach(() => {
    clearTenantWhitelistCache();
    process.env.REACTORY_APP_WHITELIST = '';
    jest.spyOn(ReactoryClient, 'findOne').mockImplementation(((filter: any) => ({
      exec: () => Promise.resolve(filter.key === 'tenant-a' ? { key: 'tenant-a', whitelist: ['https://a.example.com'] } : null),
    })) as any);
  });

  afterEach(() => {
    process.env.REACTORY_APP_WHITELIST = originalWhitelist;
    jest.restoreAllMocks();
  });

  const run = (origin: string) => new Promise<{ res: any; next: jest.Mock }>((resolve) => {
    const req: any = {
      method: 'POST',
      url: '/graphql',
      path: '/graphql',
      headers: { origin, 'x-client-key': 'tenant-a' },
      query: {},
      params: {},
    };
    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader: jest.fn(function (this: any, k: string, v: string) { this.headers[k.toLowerCase()] = v; }),
      getHeader: jest.fn(function (this: any, k: string) { return this.headers[k.toLowerCase()]; }),
      status: jest.fn(function (this: any, code: number) { this.statusCode = code; return this; }),
      json: jest.fn(function (this: any, body: any) { this.body = body; resolve({ res: this, next }); return this; }),
      end: jest.fn(),
    };
    const next: jest.Mock = jest.fn((): void => resolve({ res, next }));
    ReactoryCorsHandler(req, res, next);
  });

  it('answers 403 for an origin outside the tenant whitelist, without running the route', async () => {
    const { res, next } = await run('https://evil.example.com');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('origin-not-allowed');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes a whitelisted origin through with CORS headers', async () => {
    const { res, next } = await run('https://a.example.com');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe('https://a.example.com');
  });
});

describe('Tenant middleware bypass list', () => {
  const run = (originalUrl: string) => {
    const req: any = {
      originalUrl,
      path: originalUrl.split('?')[0],
      headers: { accept: 'application/json' },
      query: {},
      context: {},
    };
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn(), render: jest.fn() };
    const next = jest.fn();
    ReactoryClientAuthenticationMiddleware(req, res, next);
    return { res, next };
  };

  it('bypasses a listed path', () => {
    expect(run('/login').next).toHaveBeenCalled();
    expect(run('/auth/okta/callback?code=x&state=y').next).toHaveBeenCalled();
  });

  it('does not bypass when a listed path only appears in the query string', () => {
    const { res, next } = run('/graphql?x=/login');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('WP-A6 item 2: anonymous account seeds', () => {
  it('generates a distinct random password per account when the env var is absent', () => {
    const seeds = anonymousAccountSeeds({});
    expect(seeds).toHaveLength(2);
    seeds.forEach((seed) => {
      expect(seed.generatedPassword).toBe(true);
      expect(seed.password.length).toBeGreaterThanOrEqual(32);
      expect(['anonymousepassword', 'anonymous-password', 'anonymouspassword']).not.toContain(seed.password);
    });
    expect(seeds[0].password).not.toBe(seeds[1].password);
  });

  it('uses the configured password when set', () => {
    const seeds = anonymousAccountSeeds({ [ANONYMOUS_PASSWORD_ENV]: 'configured-anon-password' });
    seeds.forEach((seed) => {
      expect(seed.password).toBe('configured-anon-password');
      expect(seed.generatedPassword).toBe(false);
    });
  });
});
