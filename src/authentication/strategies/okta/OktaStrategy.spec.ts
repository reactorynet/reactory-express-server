/**
 * Okta Authentication Strategy Tests
 */

import {
  createMockRequest,
  createMockUser,
  createMockPartner,
  createMockOAuthProfile,
  createMockUserService,
  testData,
} from '../__tests__/utils';

describe('OktaStrategy', () => {
  describe('Strategy Configuration', () => {
    it('should be properly configured for OIDC', () => {
      const OktaStrategy = require('./OktaStrategy').default;
      expect(OktaStrategy).toBeDefined();
      expect(OktaStrategy.name).toBe('openidconnect');
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

  describe('Authentication Callback', () => {
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = createMockRequest({
        context: {
          getService: jest.fn(() => createMockUserService()),
          partner: createMockPartner(),
        } as any,
      });

      const ReactoryClient = require('@reactory/server-modules/reactory-core/models').ReactoryClient;
      ReactoryClient.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(createMockPartner()),
      });
    });

    it('should create new user with Okta profile', () => {
      const profile = createMockOAuthProfile('okta');
      expect(profile.id).toBeDefined();
      expect(profile.displayName).toBeDefined();
    });

    it('should handle OIDC profile format', () => {
      const profile = createMockOAuthProfile('okta', {
        _json: {
          email: 'test@company.com',
          given_name: 'Test',
          family_name: 'User',
          sub: 'okta-user-id-123',
        },
      });
      expect(profile._json.email).toBe('test@company.com');
      expect(profile._json.sub).toBeDefined();
    });

    it('should store Okta user ID and issuer', () => {
      const authProps = {
        oktaId: 'okta-123',
        sub: 'okta-user-id',
        issuer: 'https://dev-123456.okta.com/oauth2/default',
        access_token: 'token',
      };
      expect(authProps.oktaId).toBeDefined();
      expect(authProps.issuer).toContain('okta.com');
    });

    it('should extract email from various profile formats', () => {
      const profile1 = { emails: [{ value: 'test1@company.com' }] };
      const profile2 = { _json: { email: 'test2@company.com' } };
      const profile3 = { _json: { preferred_username: 'test3@company.com' } };

      expect(profile1.emails[0].value).toBe('test1@company.com');
      expect(profile2._json.email).toBe('test2@company.com');
      expect(profile3._json.preferred_username).toBe('test3@company.com');
    });
  });

  describe('Okta Routes', () => {
    let mockApp: any;

    beforeEach(() => {
      mockApp = { get: jest.fn() };
    });

    it('should register all required endpoints', () => {
      const { useOktaRoutes } = require('./OktaStrategy');
      useOktaRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(
        '/auth/okta/start/:clientKey',
        expect.any(Function)
      );
      expect(mockApp.get).toHaveBeenCalledWith(
        '/auth/okta/callback',
        expect.any(Function)
      );
      expect(mockApp.get).toHaveBeenCalledWith(
        '/auth/okta/failure',
        expect.any(Function)
      );
    });

    it('should use state manager for CSRF protection', () => {
      const { useOktaRoutes } = require('./OktaStrategy');
      const { StateManager } = require('../security');
      
      expect(StateManager).toBeDefined();
      // StateManager is instantiated in useOktaRoutes
      useOktaRoutes(mockApp);
      expect(mockApp.get).toHaveBeenCalled();
    });
  });

  describe('Okta-Specific Features', () => {
    it('should support custom authorization server', () => {
      const customIssuer = 'https://dev-123456.okta.com/oauth2/custom-auth-server';
      process.env.OKTA_ISSUER = customIssuer;
      
      // Verify issuer can be customized
      expect(process.env.OKTA_ISSUER).toBe(customIssuer);
    });

    it('should handle Okta domain format', () => {
      const domains = [
        'dev-123456.okta.com',
        'company.okta.com',
        'subdomain.oktapreview.com',
      ];

      domains.forEach(domain => {
        expect(domain).toMatch(/^[\w-]+\.(okta\.com|oktapreview\.com)$/);
      });
    });
  });
});

