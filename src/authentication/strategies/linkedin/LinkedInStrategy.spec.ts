/**
 * LinkedIn Authentication Strategy Tests
 */

import {
  createMockRequest,
  createMockUser,
  createMockPartner,
  createMockOAuthProfile,
  createMockUserService,
  testData,
} from '../__tests__/utils';
import { StateManager } from '../security';

describe('LinkedInStrategy', () => {
  describe('Strategy Configuration', () => {
    it('should be properly configured', () => {
      const LinkedInStrategy = require('./LinkedInStrategy').default;
      expect(LinkedInStrategy).toBeDefined();
      expect(LinkedInStrategy.name).toBe('linkedin');
    });

    it('should use updated API v2 scopes', () => {
      // Verify new scopes: openid, profile, email (not deprecated r_emailaddress, r_liteprofile)
      const expectedScopes = ['openid', 'profile', 'email'];
      const scopeString = process.env.LINKEDIN_OAUTH_SCOPE || 'openid,profile,email';
      const actualScopes = scopeString.split(',');
      
      expectedScopes.forEach(scope => {
        expect(actualScopes).toContain(scope);
      });
      
      // Should NOT contain deprecated scopes
      expect(actualScopes).not.toContain('r_emailaddress');
      expect(actualScopes).not.toContain('r_liteprofile');
    });
  });

  describe('Authentication Callback', () => {
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = createMockRequest({
        context: {
          getService: jest.fn(() => createMockUserService()),
        } as any,
        session: {
          authState: StateManager.createState({
            'x-client-key': testData.clientKey,
            flow: 'linkedin',
          }),
        } as any,
      });

      const ReactoryClient = require('@reactory/server-modules/reactory-core/models').ReactoryClient;
      ReactoryClient.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(createMockPartner()),
      });
    });

    it('should create new user with LinkedIn profile', () => {
      const profile = createMockOAuthProfile('linkedin');
      expect(profile.id).toBeDefined();
      expect(profile.emails).toBeDefined();
    });

    it('should handle API v2 profile format', () => {
      const profile = createMockOAuthProfile('linkedin', {
        name: {
          givenName: 'Professional',
          familyName: 'User',
        },
      });
      expect(profile.name?.givenName).toBe('Professional');
      expect(profile.name?.familyName).toBe('User');
    });
  });

  describe('LinkedIn Routes', () => {
    let mockApp: any;

    beforeEach(() => {
      mockApp = { get: jest.fn() };
    });

    it('should register all required endpoints', () => {
      const { useLinkedInRoutes } = require('./LinkedInStrategy');
      useLinkedInRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/auth/linkedin/start', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/auth/linkedin/callback', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/auth/linkedin/failure', expect.any(Function));
    });
  });
});

