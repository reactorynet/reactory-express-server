/**
 * Okta Authentication Strategy Tests
 */

import passport from 'passport';
import {
  createMockRequest,
  createMockUser,
  createMockPartner,
  createMockOAuthProfile,
  createMockUserService,
} from '../__tests__/testUtils';
import { oktaVerifyCallback, useOktaRoutes } from './OktaStrategy';
import TenantStrategyRegistry from '../TenantStrategyRegistry';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import Helpers from '../helpers';

describe('WP-A5: OktaStrategy and TenantStrategyRegistry', () => {
  beforeEach(() => {
    TenantStrategyRegistry.clear();
  });

  describe('Strategy Configuration', () => {
    it('should be named okta, matching passport-okta-oauth20 registration', () => {
      const OktaStrategy = require('./OktaStrategy').default;
      expect(OktaStrategy).toBeDefined();
      expect(OktaStrategy.name).toBe('okta');
    });

    it('should use correct Okta domain configuration', () => {
      const domain = process.env.OKTA_DOMAIN || 'your-domain.okta.com';
      expect(domain).toBeDefined();
      expect(domain).toMatch(/\.okta\.com$/);
    });

    it('should construct correct issuer URL', () => {
      const domain = process.env.OKTA_DOMAIN || 'dev-123456.okta.com';
      const issuer = process.env.OKTA_ISSUER || `https://${domain}/oauth2/default`;
      expect(issuer).toMatch(/^https:\/\//);
      expect(issuer).toContain('okta.com');
    });
  });

  describe('Authentication Callback with req present', () => {
    let mockReq: any;
    let mockUserService: any;

    beforeEach(() => {
      mockUserService = createMockUserService();
      mockReq = createMockRequest({
        ip: '127.0.0.1',
        context: {
          getService: jest.fn(() => mockUserService),
          partner: createMockPartner({ key: 'okta-tenant', _id: '507f1f77bcf86cd799439011' }),
          user: createMockUser(),
        } as any,
      });

      jest.spyOn(Helpers, 'generateLoginToken').mockResolvedValue('mock-login-token' as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('executes verify callback with req in scope without throwing ReferenceError', async () => {
      const profile = {
        id: 'okta-user-123',
        displayName: 'Okta Test User',
        emails: [{ value: 'okta.user@example.com' }],
      };

      const mockDone = jest.fn();

      await oktaVerifyCallback(
        mockReq,
        'mock-access-token',
        'mock-refresh-token',
        { id_token: 'mock-id-token' },
        profile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalled();
      const [err, token] = mockDone.mock.calls[0];
      expect(err).toBeNull();
      expect(token).toBe('mock-login-token');
    });

    it('fails verify callback with error when profile has no email', async () => {
      const profile = {
        id: 'okta-user-123',
        displayName: 'No Email User',
      };

      const mockDone = jest.fn();

      await oktaVerifyCallback(
        mockReq,
        'mock-access-token',
        'mock-refresh-token',
        {},
        profile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(Error),
        false,
      );
    });
  });

  describe('TenantStrategyRegistry and Per-Tenant Okta Credentials', () => {
    it('creates per-tenant strategy when partner has auth_config with okta properties', () => {
      const partner = {
        key: 'tenant-acme',
        auth_config: [
          {
            provider: 'okta',
            enabled: true,
            properties: {
              clientID: 'acme-okta-client-id',
              clientSecret: 'acme-okta-client-secret',
              domain: 'acme.okta.com',
            },
          },
        ],
      };

      const name = TenantStrategyRegistry.getStrategyName('okta', partner);
      expect(name).toBe('okta:tenant-acme');

      // Verify strategy was registered with passport
      const registeredStrategy = (passport as any)._strategies['okta:tenant-acme'];
      expect(registeredStrategy).toBeDefined();
      expect(registeredStrategy.name).toBe('okta');
    });

    it('returns default strategy name "okta" when partner has no okta auth_config', () => {
      const partner = {
        key: 'tenant-vanilla',
        auth_config: [],
      };

      const name = TenantStrategyRegistry.getStrategyName('okta', partner);
      expect(name).toBe('okta');
    });

    it('detects when okta provider is disabled for a tenant', () => {
      const enabledPartner = {
        key: 'tenant-on',
        auth_config: [{ provider: 'okta', enabled: true, properties: {} }],
      };
      const disabledPartner = {
        key: 'tenant-off',
        auth_config: [{ provider: 'okta', enabled: false, properties: {} }],
      };

      expect(TenantStrategyRegistry.isProviderEnabled('okta', enabledPartner)).toBe(true);
      expect(TenantStrategyRegistry.isProviderEnabled('okta', disabledPartner)).toBe(false);
    });
  });

  describe('Okta Routes and Tenant-Gating', () => {
    let mockApp: any;
    let routes: Record<string, Function>;

    beforeEach(() => {
      routes = {};
      mockApp = {
        get: jest.fn((path: string, handler: Function) => {
          routes[path] = handler;
        }),
      };
      useOktaRoutes(mockApp);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns 404 when Okta is disabled for the tenant', async () => {
      const disabledPartner = {
        key: 'disabled-client',
        auth_config: [{ provider: 'okta', enabled: false }],
      };

      jest.spyOn(ReactoryClient, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(disabledPartner),
      } as any);

      const req: any = {
        params: { clientKey: 'disabled-client' },
        context: {},
        headers: {},
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await routes['/auth/okta/start/:clientKey'](req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Okta authentication is disabled for this tenant' }),
      );
    });

    it('calls passport.authenticate with okta:clientKey for tenant with custom Okta config', async () => {
      const customPartner = {
        key: 'custom-client',
        _id: '507f1f77bcf86cd799439011',
        auth_config: [
          {
            provider: 'okta',
            enabled: true,
            properties: {
              clientID: 'custom-client-id',
              clientSecret: 'custom-secret',
              domain: 'custom.okta.com',
            },
          },
        ],
      };

      jest.spyOn(ReactoryClient, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(customPartner),
      } as any);

      const mockMiddleware = jest.fn();
      const authenticateSpy = jest.spyOn(passport, 'authenticate').mockReturnValue(mockMiddleware as any);

      const req: any = {
        params: { clientKey: 'custom-client' },
        context: {},
        headers: {},
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await routes['/auth/okta/start/:clientKey'](req, res, next);

      expect(authenticateSpy).toHaveBeenCalledWith(
        'okta:custom-client',
        expect.objectContaining({ failureRedirect: '/auth/okta/failure?clientKey=custom-client' }),
      );
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next);
    });
  });
});
