// Set environment variable before any other imports
process.env.SECRET_SAUCE = 'test-secret-key-for-testing';

import JWTStrategy from '../JWTStrategy';
import { Strategy as JwtStrategy } from 'passport-jwt';

// The strategy awaits `User.findById(id)` directly, while the session lookup it
// falls back to chains `.select().lean().exec()` off the same call. The mock has
// to answer both, so it returns a thenable that also carries the query chain.
const storedSessions: { value: any[] } = { value: [] };
const findByIdResult: { user: any; error: Error | null } = { user: null, error: null };

const makeFindByIdResult = () => ({
  then: (resolve: any, reject: any) =>
    findByIdResult.error
      ? Promise.reject(findByIdResult.error).catch(reject)
      : Promise.resolve(findByIdResult.user).then(resolve),
  catch: (reject: any) => Promise.resolve(findByIdResult.user).catch(reject),
  select: () => ({
    lean: () => ({
      exec: async () => ({ sessionInfo: storedSessions.value }),
    }),
  }),
});

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    findById: jest.fn(() => makeFindByIdResult()),
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

jest.mock('../telemetry', () => ({
  recordAttempt: jest.fn(),
  recordFailure: jest.fn(),
  recordSuccess: jest.fn(),
}));

describe('JWT Strategy', () => {
  let mockUser: any;
  let mockRequest: any;
  let mockDone: jest.Mock;

  /** Let the strategy's promise chain settle. */
  const flush = async () => {
    for (let i = 0; i < 5; i += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storedSessions.value = [];
    findByIdResult.user = null;
    findByIdResult.error = null;

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
    it('should reject expired tokens', (done) => {
      const pastTime = Date.now() - 10000; // 10 seconds ago
      const payload = { userId: 'user123', exp: pastTime };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, false);
        done();
      });
    });

    it('should reject tokens without expiration', (done) => {
      const payload = { userId: 'user123' };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, false);
        done();
      });
    });

    it('should reject tokens without userId', (done) => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const payload = { exp: futureTime };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, false);
        done();
      });
    });
  });

  describe('User Authentication', () => {
    beforeEach(() => {
      findByIdResult.user = mockUser;
    });

    const futureTime = () => Date.now() + 3600000;

    /**
     * A session-backed payload. `sid` is what marks a token as belonging to a
     * session; the login path always sets it.
     */
    const sessionPayload = (overrides: any = {}) => ({
      userId: 'user123',
      exp: futureTime(),
      iat: Date.now(),
      refresh: 'refresh-token-123',
      sid: 'sess-1',
      ...overrides,
    });

    const securityService = (overrides: any = {}) => ({
      resolveSessionState: jest.fn().mockResolvedValue('valid'),
      validateSession: jest.fn().mockResolvedValue(true),
      touchSession: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    const verify = (payload: any) => (JWTStrategy as any)._verify(mockRequest, payload, mockDone);

    it('authenticates a token that is not session-backed', async () => {
      // No sid: an out-of-band token (password-reset link, assessment link, CLI).
      // These were never recorded in sessionInfo, so they are judged on signature
      // and expiry alone.
      const service = securityService();
      mockRequest.context.getService.mockReturnValue(service);
      storedSessions.value = [
        { id: 'sess-other', client: 'test-client', jwtPayload: { refresh: 'someone-elses' } },
      ];

      verify({ userId: 'user123', exp: futureTime(), refresh: 'out-of-band-refresh' });
      await flush();

      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      expect(service.resolveSessionState).not.toHaveBeenCalled();
      expect(mockRequest.context.user).toBe(mockUser);
    });

    it('authenticates a session-backed token with a live session', async () => {
      const service = securityService();
      mockRequest.context.getService.mockReturnValue(service);

      const payload = sessionPayload();
      verify(payload);
      await flush();

      expect(service.resolveSessionState).toHaveBeenCalledWith('user123', 'refresh-token-123', {
        clientKey: 'test-client',
        issuedAt: payload.iat,
      });
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('rejects a session-backed token whose session is gone', async () => {
      mockRequest.context.getService.mockReturnValue(
        securityService({ resolveSessionState: jest.fn().mockResolvedValue('revoked') })
      );

      verify(sessionPayload());
      await flush();

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });

    it('rejects a token presented to a different application', async () => {
      mockRequest.context.getService.mockReturnValue(
        securityService({ resolveSessionState: jest.fn().mockResolvedValue('client_mismatch') })
      );

      verify(sessionPayload());
      await flush();

      expect(mockDone).toHaveBeenCalledWith(null, false);
    });

    it('reports the reason a session-backed token was refused', async () => {
      const AuthTelemetry = require('../telemetry');
      mockRequest.context.getService.mockReturnValue(
        securityService({ resolveSessionState: jest.fn().mockResolvedValue('client_mismatch') })
      );

      verify(sessionPayload());
      await flush();

      expect(AuthTelemetry.recordFailure).toHaveBeenCalledWith(
        'jwt',
        'test-client',
        'session_client_mismatch',
        expect.any(Number)
      );
    });

    it('falls back to validateSession on a service that predates resolveSessionState', async () => {
      const service: any = securityService();
      delete service.resolveSessionState;
      mockRequest.context.getService.mockReturnValue(service);

      const payload = sessionPayload();
      verify(payload);
      await flush();

      expect(service.validateSession).toHaveBeenCalledWith('user123', 'refresh-token-123', {
        clientKey: 'test-client',
        issuedAt: payload.iat,
      });
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    describe('when the security service is unavailable', () => {
      beforeEach(() => {
        mockRequest.context.getService.mockImplementation(() => {
          throw new Error('Service not available');
        });
      });

      it('authenticates against the session read directly from the user', async () => {
        storedSessions.value = [
          { id: 'sess-1', client: 'test-client', jwtPayload: { refresh: 'refresh-token-123' } },
        ];

        verify(sessionPayload());
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      });

      it('rejects when no session carries the token', async () => {
        storedSessions.value = [
          { id: 'sess-1', client: 'test-client', jwtPayload: { refresh: 'a-different-token' } },
        ];

        verify(sessionPayload());
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, false);
      });

      it('rejects a token belonging to another application', async () => {
        storedSessions.value = [
          { id: 'sess-1', client: 'partner-b', jwtPayload: { refresh: 'refresh-token-123' } },
        ];

        verify(sessionPayload());
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, false);
      });

      it('rejects when the user holds no sessions at all', async () => {
        storedSessions.value = [];

        verify(sessionPayload());
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, false);
      });

      it('picks out the right session when the user is signed into several applications', async () => {
        storedSessions.value = [
          { id: 'a', client: 'test-client', jwtPayload: { refresh: 'refresh-token-partner-a' } },
          { id: 'b', client: 'partner-b', jwtPayload: { refresh: 'refresh-token-partner-b' } },
        ];

        verify(sessionPayload({ refresh: 'refresh-token-partner-a' }));
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      });

      it('honours several sessions for the same application', async () => {
        storedSessions.value = [
          { id: 'laptop', client: 'test-client', jwtPayload: { refresh: 'refresh-laptop' } },
          { id: 'phone', client: 'test-client', jwtPayload: { refresh: 'refresh-phone' } },
        ];

        verify(sessionPayload({ refresh: 'refresh-phone' }));
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, mockUser);
      });

      it('rejects an expired session even though the token itself has not expired', async () => {
        storedSessions.value = [
          {
            id: 'sess-1',
            client: 'test-client',
            jwtPayload: { refresh: 'refresh-token-123', exp: Date.now() - 1000 },
          },
        ];

        verify(sessionPayload());
        await flush();

        expect(mockDone).toHaveBeenCalledWith(null, false);
      });
    });

    it('should reject user not found in database', (done) => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findById.mockResolvedValue(null);

      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'nonexistent',
        exp: futureTime,
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, false);
        done();
      });
    });

    it('should handle database errors', (done) => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findById.mockRejectedValue(new Error('Database error'));

      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, false);
        done();
      });
    });
  });

  describe('Context without Partner', () => {
    beforeEach(() => {
      const { User } = require('@reactory/server-modules/reactory-core/models');
      User.findById.mockResolvedValue(mockUser);
    });

    it('should handle requests without partner context', (done) => {
      mockRequest.context.partner = null;

      const futureTime = Date.now() + 3600000;
      const payload = {
        userId: 'user123',
        exp: futureTime,
      };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, mockUser);
        done();
      });
    });
  });

  describe('Secret Key Validation', () => {
    // NOTE: This test is skipped because JwtOptions.secretOrKey is evaluated at module load time.
    // Changing process.env.SECRET_SAUCE after the module is loaded will not affect the validation.
    // To properly test this scenario, the module would need to be reloaded or JwtOptions mocked.
    it.skip('should reject when secret key is not set', (done) => {
      // Temporarily change the secret
      const originalSecret = process.env.SECRET_SAUCE;
      process.env.SECRET_SAUCE = 'secret-key-needs-to-be-set';

      const payload = { userId: 'user123' };

      const verifyFunction = (JWTStrategy as any)._verify;
      verifyFunction(mockRequest, payload, mockDone);

      setImmediate(() => {
        expect(mockDone).toHaveBeenCalledWith(null, false);

        // Restore
        process.env.SECRET_SAUCE = originalSecret;
        done();
      });
    });
  });
});