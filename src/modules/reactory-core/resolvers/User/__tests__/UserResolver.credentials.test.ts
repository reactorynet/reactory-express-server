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
 * only for the account owner and for administrators of a partner the account
 * belongs to - ADMIN is held per partner, so it does not reach other tenants'
 * users. A refused read returns
 * `null` rather than throwing, so one redacted field cannot fail a whole query.
 * Even an allowed read never returns the refresh token itself.
 */

const OWNER_ID = '507f1f77bcf86cd799439012';
const OTHER_ID = '507f1f77bcf86cd799439013';
const PARTNER_ID = '507f1f77bcf86cd7994390aa';
const OTHER_PARTNER_ID = '507f1f77bcf86cd7994390bb';

const LIVE_REFRESH = 'eyJhbGciOiJIUzI1NiJ9.live-refresh-token.signature';
const LIVE_ACCESS_TOKEN = 'ya29.a0AfH6SMB-live-google-oauth-token';

const userDocument = (id: string, partnerIds: string[] = [PARTNER_ID]) => ({
  _id: id,
  memberships: partnerIds.map((clientId) => ({ clientId, roles: ['USER'] })),
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

/**
 * `roles` are the caller's roles in an enabled membership of the current
 * partner. `hasRole` is wired to answer true for them AND for document-level
 * roles, mirroring `User.hasRole`'s fallback - the gate must not rely on it.
 */
const CONTEXT = (userId: string, roles: string[] = [], options: { membershipPartner?: string; enabled?: boolean; documentRoles?: string[] } = {}): any => ({
  user: {
    _id: userId,
    roles: options.documentRoles ?? [],
    memberships: roles.length > 0
      ? [{ clientId: options.membershipPartner ?? PARTNER_ID, roles, enabled: options.enabled ?? true }]
      : [],
  },
  partner: { _id: PARTNER_ID },
  hasRole: (role: string) => roles.includes(role) || (options.documentRoles ?? []).includes(role),
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

    it('is null for an administrator when the user is not a member of the admin\'s partner', () => {
      const foreignUser = userDocument(OWNER_ID, [OTHER_PARTNER_ID]);

      expect(invoke('sessionInfo', foreignUser, CONTEXT(OTHER_ID, ['ADMIN']))).toBeNull();
      expect(invoke('sessionInfo', foreignUser, CONTEXT(OTHER_ID, ['SUPPORT_ADMIN']))).toBeNull();
    });

    it('is null for an ADMIN of another partner (document-level roles fallback is not trusted)', () => {
      const context = CONTEXT(OTHER_ID, [], { documentRoles: ['ADMIN'] });
      expect(context.hasRole('ADMIN')).toBe(true);

      expect(invoke('sessionInfo', userDocument(OWNER_ID), context)).toBeNull();
      expect(invoke('authentications', userDocument(OWNER_ID), context)).toBeNull();
    });

    it('is null when the caller holds ADMIN only in a membership of a different partner', () => {
      const context = CONTEXT(OTHER_ID, ['ADMIN'], { membershipPartner: OTHER_PARTNER_ID });

      expect(invoke('sessionInfo', userDocument(OWNER_ID, [PARTNER_ID, OTHER_PARTNER_ID]), context)).toBeNull();
    });

    it('is null when the caller\'s admin membership is disabled', () => {
      const context = CONTEXT(OTHER_ID, ['ADMIN'], { enabled: false });

      expect(invoke('sessionInfo', userDocument(OWNER_ID), context)).toBeNull();
    });

    it('is null for an administrator reading a projected reference (no memberships loaded)', () => {
      const { memberships, ...reference } = userDocument(OWNER_ID);

      expect(invoke('sessionInfo', reference, CONTEXT(OTHER_ID, ['ADMIN']))).toBeNull();
    });

    it('matches ObjectId-shaped ids, not only strings', () => {
      const { ObjectId } = require('mongodb');
      const user = { ...userDocument(OWNER_ID), _id: new ObjectId(OWNER_ID) };
      const context = { ...CONTEXT(OWNER_ID), user: { _id: new ObjectId(OWNER_ID) } };

      expect(invoke('sessionInfo', user, context)).toHaveLength(1);
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

    it('is null for an administrator of a partner the user does not belong to', () => {
      const result = invoke('authentications', userDocument(OWNER_ID, [OTHER_PARTNER_ID]), CONTEXT(OTHER_ID, ['ADMIN']));

      expect(result).toBeNull();
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
