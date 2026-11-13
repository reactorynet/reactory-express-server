import UserResolver from '../UserResolver';

/**
 * SECURITY (REACTORY-302016408) — `User.sessionInfo` and
 * `User.authentications` are credential-bearing fields.
 *
 * `sessionInfo[].jwtPayload.refresh` is a LIVE refresh token and
 * `authentications[].props` holds provider tokens. Both used to resolve as
 * ordinary fields, so any query that could reach a `User` - a support ticket's
 * author, a comment author, a team member - could read the account's
 * credentials.
 *
 * The fields stay in the schema (the account screen uses them) but are resolved
 * only for the account owner and for administrators. A refused read returns
 * `null` rather than throwing, so one redacted field cannot fail a whole query.
 * Even an allowed read never returns the refresh token itself.
 */

const OWNER_ID = '507f1f77bcf86cd799439012';
const OTHER_ID = '507f1f77bcf86cd799439013';

const LIVE_REFRESH = 'eyJhbGciOiJIUzI1NiJ9.live-refresh-token.signature';
const LIVE_ACCESS_TOKEN = 'ya29.a0AfH6SMB-live-google-oauth-token';

const userDocument = (id: string) => ({
  _id: id,
  firstName: 'Olivia',
  lastName: 'Owner',
  email: 'owner@example.com',
  sessionInfo: [
    {
      id: 'session-1',
      host: '10.0.0.5',
      client: 'reactory-pwa',
      started: new Date('2026-11-13T05:00:00.000Z'),
      expires: new Date('2026-12-13T05:00:00.000Z'),
      refresh: LIVE_REFRESH,
      jwtPayload: { userId: id, refresh: LIVE_REFRESH },
      jwtPayloadJson: JSON.stringify({ refresh: LIVE_REFRESH }),
    },
  ],
  authentications: [
    {
      id: 'auth-1',
      provider: 'google',
      props: { accessToken: LIVE_ACCESS_TOKEN, refreshToken: '1//live-refresh', lastLogin: new Date() },
    },
  ],
});

const CONTEXT = (userId: string, roles: string[] = []): any => ({
  user: { _id: userId },
  partner: { _id: '507f1f77bcf86cd7994390aa' },
  hasRole: (role: string) => roles.includes(role),
  log: jest.fn(),
});

const invoke = (method: string, user: any, context: any, args: any = {}) => {
  const instance: any = Object.create((UserResolver as any).prototype);
  return instance[method](user, args, context);
};

describe('SECURITY — User credential fields are owner/admin only', () => {
  describe('sessionInfo', () => {
    it('is null for a caller who is neither the owner nor an administrator', () => {
      const result = invoke('sessionInfo', userDocument(OWNER_ID), CONTEXT(OTHER_ID));

      expect(result).toBeNull();
    });

    it('is readable by the owner, but never carries the live refresh token', () => {
      const result = invoke('sessionInfo', userDocument(OWNER_ID), CONTEXT(OWNER_ID));

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'session-1', host: '10.0.0.5', client: 'reactory-pwa' });
      expect(result[0].refresh).toBeUndefined();
      expect(result[0].jwtPayload).toBeUndefined();
      expect(result[0].jwtPayloadJson).toBeUndefined();
      expect(JSON.stringify(result)).not.toMatch(/"refresh"\s*:/);
    });

    it('is readable by an administrator', () => {
      const result = invoke('sessionInfo', userDocument(OWNER_ID), CONTEXT(OTHER_ID, ['ADMIN']));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-1');
    });

    it('is readable by a support administrator (account support escalation)', () => {
      const result = invoke('sessionInfo', userDocument(OWNER_ID), CONTEXT(OTHER_ID, ['SUPPORT_ADMIN']));

      expect(result).toHaveLength(1);
    });
  });

  describe('authentications', () => {
    it('is null for a caller who is neither the owner nor an administrator', () => {
      const result = invoke('authentications', userDocument(OWNER_ID), CONTEXT(OTHER_ID));

      expect(result).toBeNull();
    });

    it('is readable by the owner', () => {
      const result = invoke('authentications', userDocument(OWNER_ID), CONTEXT(OWNER_ID));

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('google');
    });

    it('is readable by an administrator', () => {
      const result = invoke('authentications', userDocument(OWNER_ID), CONTEXT(OTHER_ID, ['ADMIN']));

      expect(result).toHaveLength(1);
    });

    it('never exposes the provider token through the props resolver', () => {
      const auth = userDocument(OWNER_ID).authentications[0];
      const result = invoke('userAuthProps', auth, CONTEXT(OWNER_ID));

      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(JSON.stringify(result)).not.toMatch(/accessToken|refreshToken/);
    });
  });
});
