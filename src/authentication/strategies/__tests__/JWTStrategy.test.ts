import JWTStrategy from '../JWTStrategy';
import { Strategy as JwtStrategy } from 'passport-jwt';

// Mock dependencies
jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    findById: jest.fn(),
  },
}));

jest.mock('@reactory/server-core/logging', () => ({
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/amq', () => ({
  raiseWorkFlowEvent: jest.fn(),
}));

jest.mock('./telemetry', () => ({
  recordAttempt: jest.fn(),
  recordFailure: jest.fn(),
  recordSuccess: jest.fn(),
}));

describe('JWT Strategy', () => {
  let mockUser: any;
  let mockRequest: any;
  let mockDone: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: 'user123',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['USER'],
      memberships: [],
      hasRole: jest.fn().mockReturnValue(false),
      sessionInfo: [],
    };

    mockRequest = {
      context: {
        partner: {
          key: 'test-client',
          _id: 'partner123',
        },
        user: null,
        getService: jest.fn(),
      },
    };

    mockDone = jest.fn();
  });

  describe('Strategy Configuration', () => {
    it('should be a JWT strategy instance', () => {
      expect(JWTStrategy).toBeInstanceOf(JwtStrategy);
    });
  });

  describe('Anonymous User Authentication', () => {
    it('should authenticate anonymous user', async () => {
      const payload = { userId: '-1' };

      // Call the strategy's verify function
      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, expect.objectContaining({
        _id: 'ANON',
        id: -1,
        firstName: 'Guest',
        lastName: 'User',
        roles: ['ANON'],
        anon: true,
      }));
    });
  });

  describe('Token Validation', () => {
    it('should reject expired tokens', async () => {
      const pastTime = Date.now() - 10000; // 10 seconds ago
      const payload = { userId: 'user123', exp: pastTime };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });

    it('should reject tokens without expiration', async () => {
      const payload = { userId: 'user123' };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });

    it('should reject tokens without userId', async () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const payload = { exp: futureTime };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });
  });

  describe('User Authentication', () => {
    beforeEach(() => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findById.mockResolvedValue(mockUser);
    });

    it('should authenticate valid user without session validation', async () => {
      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
        // No refresh token
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      expect(mockRequest.context.user).toBe(mockUser);
    });

    it('should authenticate user with valid session', async () => {
      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
        refresh: 'refresh-token-123',
      };

      // Mock security service
      const mockSecurityService = {
        validateSession: jest.fn().mockResolvedValue(true),
        touchSession: jest.fn().mockResolvedValue(undefined),
      };

      mockRequest.context.getService.mockReturnValue(mockSecurityService);

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockSecurityService.validateSession).toHaveBeenCalledWith('user123', 'refresh-token-123');
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should reject user with invalid session', async () => {
      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
        refresh: 'invalid-refresh-token',
      };

      const mockSecurityService = {
        validateSession: jest.fn().mockResolvedValue(false),
      };

      mockRequest.context.getService.mockReturnValue(mockSecurityService);

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });

    it('should handle session validation fallback when security service fails', async () => {
      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
        refresh: 'refresh-token-123',
      };

      // Mock security service to throw error
      mockRequest.context.getService.mockImplementation(() => {
        throw new Error('Service not available');
      });

      // Set up user with matching session
      mockUser.sessionInfo = [{
        jwtPayload: { refresh: 'refresh-token-123' }
      }];

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should reject user not found in database', async () => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findById.mockResolvedValue(null);

      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'nonexistent',
        exp: futureTime,
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });

    it('should handle database errors', async () => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findById.mockRejectedValue(new Error('Database error'));

      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });
  });

  describe('Context without Partner', () => {
    it('should handle requests without partner context', async () => {
      mockRequest.context.partner = null;

      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });
  });

  describe('Secret Key Validation', () => {
    it('should reject when secret key is not set', async () => {
      // Temporarily change the secret
      const originalSecret = process.env.SECRET_SAUCE;
      process.env.SECRET_SAUCE = 'secret-key-needs-to-be-set';

      const payload = { userId: 'user123' };

      const verifyFunction = (JWTStrategy as any)._verify;
      await verifyFunction(mockRequest, payload, mockDone);

      expect(mockDone).toHaveBeenCalledWith(null, false);

      // Restore
      process.env.SECRET_SAUCE = originalSecret;
    });
  });
});