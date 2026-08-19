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

  describe('addSession and Multi-Tenant / Multi-Session Support', () => {
    let mockUser: any;

    beforeEach(() => {
      mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        firstName: 'John',
        lastName: 'Doe',
        sessionInfo: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should allow multiple active sessions for the same client', async () => {
      const token1 = Helpers.jwtTokenForUser(mockUser);
      const token2 = Helpers.jwtTokenForUser(mockUser);

      await Helpers.addSession(mockUser, token1, '127.0.0.1', 'partner-a');
      expect(mockUser.sessionInfo).toHaveLength(1);
      expect(mockUser.sessionInfo[0].client).toBe('partner-a');

      await Helpers.addSession(mockUser, token2, '127.0.0.1', 'partner-a');
      expect(mockUser.sessionInfo).toHaveLength(2);
      expect(mockUser.sessionInfo[0].client).toBe('partner-a');
      expect(mockUser.sessionInfo[1].client).toBe('partner-a');
      expect(mockUser.sessionInfo[0].jwtPayload.refresh).not.toBe(mockUser.sessionInfo[1].jwtPayload.refresh);
    });

    it('should preserve existing sessions when logging into a different client/partner', async () => {
      const tokenA = Helpers.jwtTokenForUser(mockUser);
      const tokenB = Helpers.jwtTokenForUser(mockUser);

      await Helpers.addSession(mockUser, tokenA, '127.0.0.1', 'partner-a');
      await Helpers.addSession(mockUser, tokenB, '127.0.0.1', 'partner-b');

      expect(mockUser.sessionInfo).toHaveLength(2);
      const partnerASession = mockUser.sessionInfo.find((s: any) => s.client === 'partner-a');
      const partnerBSession = mockUser.sessionInfo.find((s: any) => s.client === 'partner-b');

      expect(partnerASession).toBeDefined();
      expect(partnerBSession).toBeDefined();
      expect(partnerASession.jwtPayload.refresh).toBe(tokenA.refresh);
      expect(partnerBSession.jwtPayload.refresh).toBe(tokenB.refresh);
    });

    it('should automatically prune expired sessions when adding a new session', async () => {
      const expiredToken = {
        ...Helpers.jwtTokenForUser(mockUser),
        exp: Date.now() - 60000, // expired 1 minute ago
      };
      const activeToken1 = Helpers.jwtTokenForUser(mockUser);
      const activeToken2 = Helpers.jwtTokenForUser(mockUser);

      mockUser.sessionInfo = [
        { id: 'sess-old', host: '127.0.0.1', client: 'partner-a', jwtPayload: expiredToken },
        { id: 'sess-active', host: '127.0.0.1', client: 'partner-a', jwtPayload: activeToken1 },
      ];

      await Helpers.addSession(mockUser, activeToken2, '127.0.0.1', 'partner-b');

      expect(mockUser.sessionInfo).toHaveLength(2);
      const ids = mockUser.sessionInfo.map((s: any) => s.id);
      expect(ids).not.toContain('sess-old');
      expect(ids).toContain('sess-active');
    });

    it('should evict only the oldest session when max sessions per client is exceeded', async () => {
      process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = '2';

      const token1 = { ...Helpers.jwtTokenForUser(mockUser), iat: 1000 };
      const token2 = { ...Helpers.jwtTokenForUser(mockUser), iat: 2000 };
      const token3 = { ...Helpers.jwtTokenForUser(mockUser), iat: 3000 };

      await Helpers.addSession(mockUser, token1, '127.0.0.1', 'partner-a');
      await Helpers.addSession(mockUser, token2, '127.0.0.1', 'partner-a');
      expect(mockUser.sessionInfo).toHaveLength(2);

      // Adding 3rd session should drop token1 (oldest) and keep token2 and token3
      await Helpers.addSession(mockUser, token3, '127.0.0.1', 'partner-a');
      expect(mockUser.sessionInfo).toHaveLength(2);
      const refreshes = mockUser.sessionInfo.map((s: any) => s.jwtPayload.refresh);
      expect(refreshes).not.toContain(token1.refresh);
      expect(refreshes).toContain(token2.refresh);
      expect(refreshes).toContain(token3.refresh);

      delete process.env.REACTORY_MAX_SESSIONS_PER_CLIENT;
    });

    it('generateLoginToken should add session and return login token', async () => {
      const loginResult = await Helpers.generateLoginToken(mockUser, '127.0.0.1', 'partner-test');

      expect(loginResult).toHaveProperty('id', '507f1f77bcf86cd799439011');
      expect(loginResult).toHaveProperty('token');
      expect(loginResult.firstName).toBe('John');
      expect(loginResult.lastName).toBe('Doe');
      expect(mockUser.sessionInfo).toHaveLength(1);
      expect(mockUser.sessionInfo[0].client).toBe('partner-test');
    });
  });
});