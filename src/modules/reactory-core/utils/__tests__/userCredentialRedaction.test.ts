import UserModel from '../../models/User';
import ReactorySupportTicketModel from '../../models/ReactorySupportTicket';
import CommentModel from '../../models/Comment';
import TeamModel from '../../models/Team';
import {
  AUTHENTICATION_PROPS_ALLOWED_KEYS,
  redactAuthenticationProps,
  redactSession,
  redactUserCredentials,
} from '../userCredentialRedaction';

/**
 * SECURITY (REACTORY-302016408) — the User schema's `toJSON` transform.
 *
 * Uses the REAL Mongoose models (no database connection is needed to build and
 * populate documents in memory). Assigning a User document to a ref path is
 * exactly how a populated reference looks in memory, so these tests prove that
 * serialising a ticket / comment / team that carries a full user - the shape
 * `createRequest` used to return - can no longer emit a credential, whichever
 * call site forgot its projection.
 */

// Obviously fake markers, not real-looking credentials: the test only needs
// distinctive strings to search the serialised output for. (Real-looking
// fixtures trip the repository's secret scanner.)
const LIVE_HASH = 'FAKE-HASH-MARKER';
const LIVE_SALT = 'FAKE-SALT-MARKER';
const LIVE_REFRESH = 'FAKE-SESSION-REFRESH-MARKER';
const LIVE_ACCESS = 'FAKE-PROVIDER-ACCESS-MARKER';
const LIVE_PROVIDER_REFRESH = 'FAKE-PROVIDER-REFRESH-MARKER';

const LEAK = new RegExp([LIVE_HASH, LIVE_SALT, LIVE_REFRESH, LIVE_ACCESS, LIVE_PROVIDER_REFRESH]
  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));

const makeUser = () => new UserModel({
  firstName: 'Sys',
  lastName: 'Admin',
  email: 'sysadmin@example.com',
  password: LIVE_HASH,
  salt: LIVE_SALT,
  createdAt: new Date(),
  updatedAt: new Date(),
  sessionInfo: [{
    id: 'session-1',
    host: '10.0.0.5',
    client: 'reactory-pwa',
    jwtPayloadJson: JSON.stringify({ refresh: LIVE_REFRESH }),
    jwtPayload: { refresh: LIVE_REFRESH, sub: 'sub' },
  }],
  authentications: [{
    provider: 'google',
    props: { accessToken: LIVE_ACCESS, refreshToken: LIVE_PROVIDER_REFRESH, lastLogin: new Date('2026-11-13T00:00:00Z') },
  }],
} as any);

describe('User toJSON credential redaction (real Mongoose)', () => {
  it('drops every credential when a user is serialised directly', () => {
    const user: any = makeUser();
    const json = JSON.parse(JSON.stringify(user));

    expect(JSON.stringify(json)).not.toMatch(LEAK);
    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('salt');
    expect(json.firstName).toBe('Sys');
    expect(json.sessionInfo[0]).toMatchObject({ id: 'session-1', host: '10.0.0.5', client: 'reactory-pwa' });
    expect(json.sessionInfo[0]).not.toHaveProperty('jwtPayload');
    expect(json.sessionInfo[0]).not.toHaveProperty('jwtPayloadJson');
    expect(json.authentications[0].provider).toBe('google');
    expect(Object.keys(json.authentications[0].props)).toEqual(['lastLogin']);
  });

  it('leaves the live document readable (password verification and the reset fingerprint need it)', () => {
    const user: any = makeUser();
    JSON.stringify(user);

    expect(user.password).toBe(LIVE_HASH);
    expect(user.salt).toBe(LIVE_SALT);
    expect(user.sessionInfo[0].jwtPayload.refresh).toBe(LIVE_REFRESH);
    expect(user.toObject().password).toBe(LIVE_HASH);
  });

  it('redacts a full user populated into a support ticket (createdBy, assignedTo, updatedBy)', () => {
    const user = makeUser();
    const ticket: any = new ReactorySupportTicketModel({
      request: 'help', createdBy: user, assignedTo: user, updatedBy: user,
    } as any);

    expect(ticket.populated('createdBy')).toBeDefined();
    const json = JSON.stringify(ticket);

    expect(json).not.toMatch(LEAK);
    expect(JSON.parse(json).createdBy.email).toBe('sysadmin@example.com');
  });

  it('redacts a full user populated into a comment nested inside a ticket', () => {
    const user = makeUser();
    const comment: any = new CommentModel({ text: 'hi', user } as any);
    const ticket: any = new ReactorySupportTicketModel({ request: 'help', comments: [comment] } as any);

    expect(JSON.stringify(comment)).not.toMatch(LEAK);
    expect(JSON.stringify(ticket)).not.toMatch(LEAK);
  });

  it('redacts full users populated into a team roster', () => {
    const user = makeUser();
    const team: any = new TeamModel({ name: 'platform', owner: user, members: [user, user] } as any);

    expect(JSON.stringify(team)).not.toMatch(LEAK);
  });
});

describe('redaction helpers', () => {
  it('redactAuthenticationProps keeps only the allowlisted bookkeeping keys', () => {
    const props = { accessToken: LIVE_ACCESS, apiKey: 'k', lastLogin: 1, loginCount: 2, twoFactorEnabled: true };

    expect(redactAuthenticationProps(props)).toEqual({ lastLogin: 1, loginCount: 2, twoFactorEnabled: true });
    expect(redactAuthenticationProps(null)).toBeNull();
    expect(AUTHENTICATION_PROPS_ALLOWED_KEYS).not.toContain('accessToken');
  });

  it('redactSession drops token material from plain and hydrated sessions', () => {
    const plain = { id: 's', host: 'h', refresh: LIVE_REFRESH, jwtPayload: { refresh: LIVE_REFRESH }, jwtPayloadJson: '{}' };
    const hydrated = { toObject: () => ({ ...plain }) };

    expect(redactSession(plain)).toEqual({ id: 's', host: 'h' });
    expect(redactSession(hydrated)).toEqual({ id: 's', host: 'h' });
    expect(plain.jwtPayload.refresh).toBe(LIVE_REFRESH);
  });

  it('redactUserCredentials tolerates partial and empty users', () => {
    expect(redactUserCredentials({ firstName: 'x' })).toEqual({ firstName: 'x' });
    expect(redactUserCredentials(null as any)).toBeNull();
  });
});
