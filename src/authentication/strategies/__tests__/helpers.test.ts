import Helpers from '../helpers';
import Reactory from '@reactorynet/reactory-core';

// A minimal in-memory stand-in for the Mongoose User model.
//
// The previous mock exposed only `findById` returning undefined, which made
// every Mongo call in the session path throw and silently fall back to an
// in-memory document — so none of the behaviour that actually ships was under
// test. This fake honours the operators the session writer uses ($push, $pull,
// $set) so the tests below observe what Mongo would really end up holding.
const sessionStore: { sessionInfo: any[] } = { sessionInfo: [] };

const applyUpdate = (update: any) => {
  if (update.$pull?.sessionInfo?.id?.$in) {
    const ids: string[] = update.$pull.sessionInfo.id.$in;
    sessionStore.sessionInfo = sessionStore.sessionInfo.filter((s: any) => !ids.includes(s.id));
  }
  if (update.$push?.sessionInfo) {
    sessionStore.sessionInfo.push(update.$push.sessionInfo);
  }
  if (update.$set?.sessionInfo) {
    sessionStore.sessionInfo = update.$set.sessionInfo;
  }
  return { acknowledged: true, modifiedCount: 1 };
};

const mockUpdateOne = jest.fn((_filter: any, update: any) => ({
  exec: jest.fn().mockImplementation(async () => applyUpdate(update)),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  User: {
    findById: jest.fn(() => ({
      select: () => ({
        lean: () => ({
          exec: jest.fn().mockImplementation(async () => ({
            sessionInfo: JSON.parse(JSON.stringify(sessionStore.sessionInfo)),
          })),
        }),
      }),
    })),
    updateOne: (...args: any[]) => (mockUpdateOne as any)(...args),
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

  describe('Multi-tenant, multi-session token issuance', () => {
    let mockUser: any;

    beforeEach(() => {
      sessionStore.sessionInfo = [];
      mockUpdateOne.mockClear();
      delete process.env.REACTORY_SESSION_REUSE;
      delete process.env.REACTORY_MAX_SESSIONS_PER_CLIENT;
      delete process.env.REACTORY_MAX_TOTAL_SESSIONS;

      mockUser = {
        _id: {
          toString: () => '507f1f77bcf86cd799439011',
          toHexString: () => '507f1f77bcf86cd799439011',
        },
        firstName: 'John',
        lastName: 'Doe',
        sessionInfo: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
    });

    /** The sessions Mongo would be holding, as the writer left them. */
    const storedSessions = () => sessionStore.sessionInfo;
    const clientsOf = () => storedSessions().map((s: any) => s.client);

    describe('sessions stack across applications', () => {
      it('leaves another application\'s session untouched when logging in', async () => {
        const first = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        const second = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-b');

        expect(clientsOf().sort()).toEqual(['partner-a', 'partner-b']);
        expect(first.token).not.toBe(second.token);

        const sessionA = storedSessions().find((s: any) => s.client === 'partner-a');
        const sessionB = storedSessions().find((s: any) => s.client === 'partner-b');
        expect(sessionA.jwtPayload.refresh).not.toBe(sessionB.jwtPayload.refresh);
      });

      it('keeps every application\'s session when logging into several in turn', async () => {
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-b');
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-c');

        expect(clientsOf().sort()).toEqual(['partner-a', 'partner-b', 'partner-c']);
      });

      it('appends rather than rewriting the array, so concurrent logins both survive', async () => {
        await Promise.all([
          Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a'),
          Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-b'),
        ]);

        expect(clientsOf().sort()).toEqual(['partner-a', 'partner-b']);
      });

      it('never writes the whole session array on the normal path', async () => {
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        const updates = mockUpdateOne.mock.calls.map(([, update]: any[]) => update);
        expect(updates.some((u: any) => u.$push?.sessionInfo)).toBe(true);
        expect(updates.every((u: any) => u.$set?.sessionInfo === undefined)).toBe(true);
      });
    });

    describe('multiple sessions per application', () => {
      it('stacks a second session for the same application from a different host', async () => {
        const laptop = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        const phone = await Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-a');

        expect(clientsOf()).toEqual(['partner-a', 'partner-a']);
        expect(storedSessions().map((s: any) => s.host)).toEqual(['10.0.0.1', '10.0.0.2']);
        expect(laptop.token).not.toBe(phone.token);
      });

      it('gives each session its own refresh id', async () => {
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        await Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-a');

        const refreshes = storedSessions().map((s: any) => s.jwtPayload.refresh);
        expect(new Set(refreshes).size).toBe(2);
      });

      it('addSession always stacks, even for the same application and host', async () => {
        await Helpers.addSession(mockUser, Helpers.jwtTokenForUser(mockUser), '10.0.0.1', 'partner-a');
        await Helpers.addSession(mockUser, Helpers.jwtTokenForUser(mockUser), '10.0.0.1', 'partner-a');

        expect(storedSessions()).toHaveLength(2);
      });
    });

    describe('the same token is reissued for the same application and host', () => {
      it('hands back the identical JWT on a repeat login', async () => {
        const first = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        const second = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        expect(second.token).toBe(first.token);
        expect(storedSessions()).toHaveLength(1);
      });

      it('stays stable across many repeat logins', async () => {
        const first = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        for (let i = 0; i < 5; i += 1) {
          const repeat = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
          expect(repeat.token).toBe(first.token);
        }
        expect(storedSessions()).toHaveLength(1);
      });

      it('does not reuse a token issued for a different application', async () => {
        const a = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        const b = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-b');

        expect(b.token).not.toBe(a.token);
      });

      it('mints a new token once the existing session has expired', async () => {
        const first = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        // Age the stored session out.
        sessionStore.sessionInfo[0].jwtPayload.exp = Date.now() - 1000;

        const second = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        expect(second.token).not.toBe(first.token);
        expect(storedSessions()).toHaveLength(1);
      });

      it('mints a new token when reuse is switched off', async () => {
        process.env.REACTORY_SESSION_REUSE = 'false';

        const first = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        const second = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        expect(second.token).not.toBe(first.token);
        expect(storedSessions()).toHaveLength(2);
      });

      it('records the login even though no session is added', async () => {
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        mockUpdateOne.mockClear();

        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        const updates = mockUpdateOne.mock.calls.map(([, update]: any[]) => update);
        expect(updates).toHaveLength(1);
        expect(updates[0].$set.lastLogin).toBeInstanceOf(Date);
        expect(updates[0].$push).toBeUndefined();
      });
    });

    describe('session pruning and caps', () => {
      it('prunes expired sessions when a new one is added', async () => {
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        sessionStore.sessionInfo[0].jwtPayload.exp = Date.now() - 1000;
        const staleId = sessionStore.sessionInfo[0].id;

        await Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-b');

        expect(storedSessions().map((s: any) => s.id)).not.toContain(staleId);
        expect(clientsOf()).toEqual(['partner-b']);
      });

      it('evicts the oldest session for the application once the per-client cap is hit', async () => {
        process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = '2';

        const first = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        await Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-a');
        await Helpers.generateLoginToken(mockUser, '10.0.0.3', 'partner-a');

        expect(storedSessions()).toHaveLength(2);
        expect(storedSessions().map((s: any) => s.host)).toEqual(['10.0.0.2', '10.0.0.3']);
        expect(first).toBeDefined();
      });

      it('does not let one application\'s cap evict another application\'s session', async () => {
        process.env.REACTORY_MAX_SESSIONS_PER_CLIENT = '1';

        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-b');
        await Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-a');
        await Helpers.generateLoginToken(mockUser, '10.0.0.3', 'partner-a');

        expect(clientsOf().sort()).toEqual(['partner-a', 'partner-b']);
      });

      it('applies the global cap across applications', async () => {
        process.env.REACTORY_MAX_TOTAL_SESSIONS = '2';

        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        await Helpers.generateLoginToken(mockUser, '10.0.0.2', 'partner-b');
        await Helpers.generateLoginToken(mockUser, '10.0.0.3', 'partner-c');

        expect(storedSessions()).toHaveLength(2);
        expect(clientsOf()).toEqual(['partner-b', 'partner-c']);
      });
    });

    describe('token payloads', () => {
      it('stamps a sid claim naming the session', async () => {
        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        const stored = storedSessions()[0];
        expect(stored.jwtPayload.sid).toBe(stored.id);
        expect(JSON.parse(stored.jwtPayloadJson).sid).toBe(stored.id);
      });

      it('leaves out-of-band tokens session-free and without a sid', () => {
        const payload = Helpers.jwtTokenForUser(mockUser);

        expect(payload).not.toHaveProperty('sid');
        expect(storedSessions()).toHaveLength(0);
      });

      it('returns the expected login result shape', async () => {
        const result = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');

        expect(result).toEqual({
          id: '507f1f77bcf86cd799439011',
          firstName: 'John',
          lastName: 'Doe',
          token: expect.any(String),
        });
      });
    });

    describe('session cache invalidation', () => {
      it('invalidates the cached session set through the request context', async () => {
        const invalidateSessionCache = jest.fn().mockResolvedValue(undefined);
        const context: any = {
          getService: jest.fn().mockReturnValue({ invalidateSessionCache }),
        };

        await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a', context);

        expect(context.getService).toHaveBeenCalledWith('core.SecurityService@1.0.0');
        expect(invalidateSessionCache).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      });

      it('still issues a token when the security service is unavailable', async () => {
        const context: any = {
          getService: jest.fn(() => {
            throw new Error('service not registered');
          }),
        };

        const result = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a', context);

        expect(result.token).toEqual(expect.any(String));
        expect(storedSessions()).toHaveLength(1);
      });

      it('does not require a context at all', async () => {
        const result = await Helpers.generateLoginToken(mockUser, '10.0.0.1', 'partner-a');
        expect(result.token).toEqual(expect.any(String));
      });
    });
  });
});
