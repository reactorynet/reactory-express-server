import Helpers from '../helpers';
import Reactory from '@reactorynet/reactory-core';

// Mock the User model
jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    findById: jest.fn(),
  },
}));

// Mock amq
jest.mock('@reactory/server-core/amq', () => ({
  raiseWorkFlowEvent: jest.fn(),
}));

// Mock AuthTelemetry
jest.mock('../telemetry', () => ({
  recordTokenGeneration: jest.fn(),
}));

describe('Authentication Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('jwtTokenForUser', () => {
    const mockUser = {
      _id: {
        toString: () => '507f1f77bcf86cd799439011',
      },
      firstName: 'John',
      lastName: 'Doe',
    } as Reactory.Models.IUserDocument;

    it('should generate JWT token payload for user', () => {
      const token = Helpers.jwtTokenForUser(mockUser);

      expect(token).toHaveProperty('userId', '507f1f77bcf86cd799439011');
      expect(token).toHaveProperty('name', 'John Doe');
      expect(token).toHaveProperty('refresh');
      expect(token).toHaveProperty('iss');
      expect(token).toHaveProperty('sub');
      expect(token).toHaveProperty('aud');
      expect(token).toHaveProperty('exp');
      expect(token).toHaveProperty('iat');
    });

    it('should throw error for null user', () => {
      expect(() => {
        Helpers.jwtTokenForUser(null as any);
      }).toThrow('User object cannot be null');
    });

    it('should use custom options when provided', () => {
      const customOptions = {
        iss: 'custom.issuer',
        sub: 'custom-subject',
        aud: 'custom-audience',
      };

      const token = Helpers.jwtTokenForUser(mockUser, customOptions);

      expect(token.iss).toBe('custom.issuer');
      expect(token.sub).toBe('custom-subject');
      expect(token.aud).toBe('custom-audience');
    });
  });

  describe('JwtAuth', () => {
    it('should return anonymous user for userId -1', (done) => {
      const payload = { userId: '-1' };
      const doneCallback = jest.fn();

      Helpers.JwtAuth(payload, doneCallback);

      expect(doneCallback).toHaveBeenCalledWith(null, expect.objectContaining({
        _id: 'ANON',
        id: -1,
        firstName: 'Guest',
        lastName: 'User',
        roles: ['ANON'],
        anon: true,
      }));
      done();
    });

    it('should return false for expired token', (done) => {
      const pastTime = Date.now() - 10000; // 10 seconds ago
      const payload = { userId: 'someId', exp: pastTime };
      const doneCallback = jest.fn();

      Helpers.JwtAuth(payload, doneCallback);

      expect(doneCallback).toHaveBeenCalledWith(null, false);
      done();
    });

    it('should return false for token without exp', (done) => {
      const payload = { userId: 'someId' };
      const doneCallback = jest.fn();

      Helpers.JwtAuth(payload, doneCallback);

      expect(doneCallback).toHaveBeenCalledWith(null, false);
      done();
    });
  });

  describe('jwtMake', () => {
    it('should encode payload as JWT', () => {
      const payload = { test: 'data' };
      const token = Helpers.jwtMake(payload);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('getJwtTokenForUser', () => {
    const mockUser = {
      _id: {
        toString: () => '507f1f77bcf86cd799439011',
      },
      firstName: 'John',
      lastName: 'Doe',
    } as Reactory.Models.IUserDocument;

    it('should generate encoded JWT token for user', () => {
      const token = Helpers.getJwtTokenForUser(mockUser);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });
});