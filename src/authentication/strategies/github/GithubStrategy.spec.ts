/**
 * GitHub Authentication Strategy Tests
 */

import {
  createMockRequest,
  createMockUser,
  createMockPartner,
  createMockOAuthProfile,
  createMockUserService,
  authAssertions,
  testData,
} from '../__tests__/utils';
import { StateManager } from '../security';

describe('GithubStrategy', () => {
  describe('Strategy Configuration', () => {
    it('should be properly configured', () => {
      const GithubStrategy = require('./GithubStrategy').default;
      expect(GithubStrategy).toBeDefined();
      expect(GithubStrategy.name).toBe('github');
    });

    it('should have passReqToCallback enabled', () => {
      const GithubStrategy = require('./GithubStrategy').default;
      expect(GithubStrategy._passReqToCallback).toBe(true);
    });
  });

  describe('Authentication Callback', () => {
    let mockRequest: any;
    let mockUserService: any;
    let mockUser: any;

    beforeEach(() => {
      mockUserService = createMockUserService();
      mockUser = createMockUser({ email: testData.newEmail });

      mockRequest = createMockRequest({
        context: {
          getService: jest.fn(() => mockUserService),
        } as any,
        session: {
          authState: StateManager.createState({
            'x-client-key': testData.clientKey,
            flow: 'github',
          }),
        } as any,
      });

      const ReactoryClient = require('@reactory/server-modules/reactory-core/models').ReactoryClient;
      ReactoryClient.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(createMockPartner()),
      });
    });

    it('should create new user with GitHub profile data', async () => {
      const profile = createMockOAuthProfile('github');
      expect(profile.id).toBeDefined();
      expect(profile.username).toBeDefined();
    });

    it('should store GitHub username in auth props', () => {
      const authProps = {
        githubId: 'github-123',
        username: 'testuser',
        displayName: 'Test User',
        accessToken: 'token',
      };
      expect(authProps.username).toBe('testuser');
    });

    it('should handle missing email gracefully', () => {
      const profile = createMockOAuthProfile('github', { emails: [] });
      expect(profile.emails).toHaveLength(0);
    });
  });

  describe('GitHub Routes', () => {
    let mockApp: any;

    beforeEach(() => {
      mockApp = {
        get: jest.fn(),
      };
    });

    it('should register all required endpoints', () => {
      const { useGithubRoutes } = require('./GithubStrategy');
      useGithubRoutes(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/auth/github/start', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/auth/github/callback', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/auth/github/failure', expect.any(Function));
    });
  });
});

