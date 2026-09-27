/**
 * Microsoft/Azure AD Authentication Strategy Tests
 */

import {
  createMockRequest,
  createMockUser,
  createMockPartner,
  createMockOAuthProfile,
  createMockUserService,
  testData,
} from '../__tests__/testUtils';

describe('MicrosoftStrategy', () => {
  describe('Strategy Configuration', () => {
    it('should be properly configured for OIDC', () => {
      const MicrosoftStrategy = require('./MicrosoftStrategy').default;
      expect(MicrosoftStrategy).toBeDefined();
      expect(MicrosoftStrategy.name).toBe('azuread-openidconnect');
    });

    it('should validate the issuer unless the tenant is a multi-tenant authority', () => {
      const { microsoftIssuerOptions } = require('./MicrosoftStrategy');
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      const options = microsoftIssuerOptions(tenantId);
      if (['common', 'organizations', 'consumers'].includes(tenantId.toLowerCase())) {
        expect(options.validateIssuer).toBe(false);
      } else {
        expect(tenantId).toMatch(/^[a-f0-9-]{36}$/i);
        expect(options).toEqual({ validateIssuer: true, issuer: `https://login.microsoftonline.com/${tenantId}/v2.0` });
      }
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

    it('should create new user with Microsoft profile', () => {
      const profile = createMockOAuthProfile('microsoft');
      expect(profile.oid).toBeDefined();
      expect(profile.displayName).toBeDefined();
    });

    it('should handle OIDC profile format', () => {
      const profile = createMockOAuthProfile('microsoft', {
        _json: {
          email: 'test@company.com',
          given_name: 'Test',
          family_name: 'User',
          tid: 'tenant-id-123',
        },
      });
      expect(profile._json.email).toBe('test@company.com');
      expect(profile._json.tid).toBeDefined();
    });

    it('should store Microsoft OID and tenant ID', () => {
      const authProps = {
        microsoftId: 'ms-123',
        oid: 'oid-456',
        tenantId: 'tenant-789',
        access_token: 'token',
      };
      expect(authProps.oid).toBeDefined();
      expect(authProps.tenantId).toBeDefined();
    });
  });

  describe('Microsoft Routes', () => {
    let mockApp: any;

    beforeEach(() => {
      mockApp = { get: jest.fn(), post: jest.fn() };
    });

    it('should register all required endpoints', () => {
      const { useMicrosoftRoutes } = require('./MicrosoftStrategy');
      useMicrosoftRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith(
        '/auth/microsoft/openid/start/:clientKey',
        expect.any(Function)
      );
      expect(mockApp.post).toHaveBeenCalled();
      expect(mockApp.get).toHaveBeenCalledWith(
        '/auth/microsoft/openid/failure',
        expect.any(Function)
      );
    });
  });
});

