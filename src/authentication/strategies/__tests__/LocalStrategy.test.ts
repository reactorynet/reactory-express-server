import LocalStrategy, { useReactoryLocalRoutes } from '../LocalStrategy';
import { BasicStrategy } from 'passport-http';
import passport from 'passport';

// Mock dependencies
jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock('@reactory/server-core/logging', () => ({
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('./helpers', () => ({
  generateLoginToken: jest.fn(),
}));

jest.mock('./telemetry', () => ({
  recordAttempt: jest.fn(),
  recordFailure: jest.fn(),
  recordSuccess: jest.fn(),
}));

jest.mock('passport', () => ({
  authenticate: jest.fn(),
}));

describe('Local Strategy', () => {
  let mockUser: any;
  let mockRequest: any;
  let mockDone: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: 'user123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      validatePassword: jest.fn(),
      memberships: [{
        clientId: 'partner123',
        lastLogin: null,
      }],
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockRequest = {
      context: {
        partner: {
          key: 'test-client',
          _id: 'partner123',
        },
        user: null,
        debug: jest.fn(),
      },
      user: null,
    };

    mockDone = jest.fn();
  });

  describe('Strategy Configuration', () => {
    it('should be a Basic strategy instance', () => {
      expect(LocalStrategy).toBeInstanceOf(BasicStrategy);
    });
  });

  describe('Authentication Context', () => {
    it('should reject when context is missing', async () => {
      mockRequest.context = null;

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'user@example.com', 'password', mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(Error),
        false
      );
      expect(mockDone.mock.calls[0][0].message).toBe('Authentication context is missing');
    });
  });

  describe('User Lookup', () => {
    beforeEach(() => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findOne.mockResolvedValue(mockUser);
    });

    it('should reject when user is not found', async () => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findOne.mockResolvedValue(null);

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'nonexistent@example.com', 'password', mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        null,
        false,
        { message: 'Incorrect Credentials Supplied' }
      );
    });

    it('should reject when password is invalid', async () => {
      mockUser.validatePassword.mockReturnValue(false);

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'wrongpassword', mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        null,
        false,
        { message: 'Incorrect Credentials Supplied, If you have forgotten your password, use the forgot password link' }
      );
    });

    it('should authenticate valid user', async () => {
      mockUser.validatePassword.mockReturnValue(true);

      const mockToken = { id: 'user123', token: 'jwt-token-123' };
      const { generateLoginToken } = require('./helpers');
      generateLoginToken.mockResolvedValue(mockToken);

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'correctpassword', mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, mockToken);
      expect(mockRequest.user).toBe(mockUser);
      expect(mockRequest.context.user).toBe(mockUser);
    });
  });

  describe('Membership Updates', () => {
    beforeEach(() => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findOne.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockReturnValue(true);

      const mockToken = { id: 'user123', token: 'jwt-token-123' };
      const { generateLoginToken } = require('./helpers');
      generateLoginToken.mockResolvedValue(mockToken);
    });

    it('should update membership lastLogin when partner exists', async () => {
      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'correctpassword', mockDone);

      expect(mockUser.memberships[0].lastLogin).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should handle missing memberships array', async () => {
      mockUser.memberships = null;

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'correctpassword', mockDone);

      expect(mockDone).toHaveBeenCalled(); // Should not crash
    });

    it('should handle membership without matching clientId', async () => {
      mockUser.memberships = [{
        clientId: 'different-partner',
        lastLogin: null,
      }];

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'correctpassword', mockDone);

      expect(mockUser.memberships[0].lastLogin).toBeNull();
      expect(mockUser.save).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'password', mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(Error),
        false
      );
    });

    it('should handle password validation errors', async () => {
      mockUser.validatePassword.mockImplementation(() => {
        throw new Error('Password validation failed');
      });

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'password', mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(Error),
        false
      );
    });
  });

  describe('Route Configuration', () => {
    let mockApp: any;

    beforeEach(() => {
      mockApp = {
        post: jest.fn(),
      };

      const { authenticate } = require('passport');
      authenticate.mockReturnValue((req: any, res: any, next: any) => {
        next();
      });
    });

    it('should configure login route', () => {
      useReactoryLocalRoutes(mockApp);

      expect(mockApp.post).toHaveBeenCalledWith(
        '/login',
        expect.any(Function), // passport.authenticate result
        expect.any(Function)  // response handler
      );
    });

    it('should return user data in login response', () => {
      useReactoryLocalRoutes(mockApp);

      const routeHandler = mockApp.post.mock.calls[0][2];
      const mockReq = { user: mockUser };
      const mockRes = { json: jest.fn() };

      routeHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ user: mockUser });
    });
  });

  describe('Client Key Handling', () => {
    it('should use partner key when available', async () => {
      mockUser.validatePassword.mockReturnValue(true);
      const mockToken = { id: 'user123', token: 'jwt-token-123' };
      const { generateLoginToken } = require('./helpers');
      generateLoginToken.mockResolvedValue(mockToken);

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'correctpassword', mockDone);

      // Verify telemetry was called with correct client key
      const { recordSuccess } = require('./telemetry');
      expect(recordSuccess).toHaveBeenCalledWith('local', 'test-client', expect.any(Number), 'user123');
    });

    it('should default to "api" when no partner', async () => {
      mockRequest.context.partner = null;

      mockUser.validatePassword.mockReturnValue(true);
      const mockToken = { id: 'user123', token: 'jwt-token-123' };
      const { generateLoginToken } = require('./helpers');
      generateLoginToken.mockResolvedValue(mockToken);

      const authenticateFunction = (LocalStrategy as any)._verify;
      await authenticateFunction(mockRequest, 'john@example.com', 'correctpassword', mockDone);

      const { recordSuccess } = require('./telemetry');
      expect(recordSuccess).toHaveBeenCalledWith('local', 'api', expect.any(Number), 'user123');
    });
  });
});