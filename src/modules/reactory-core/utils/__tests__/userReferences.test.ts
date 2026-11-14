import { ObjectId } from 'mongodb';
import {
  isPopulatedUser,
  pickUserReference,
  resolveUserReference,
  resolveUserReferences,
} from '../userReferences';
import {
  USER_REFERENCE_FIELDS,
  USER_REFERENCE_SELECT,
  USER_REFERENCE_WITH_ROLES_FIELDS,
  USER_REFERENCE_WITH_ROLES_SELECT,
} from '../userReferenceSelect';

/**
 * SECURITY (REACTORY-302016408) — GraphQL user-reference fields (Team.owner,
 * Team.members, BusinessUnit.owner/members, ReactoryFormSubmission.user) used
 * to `findById` each id and return the complete User document, and ignored a
 * parent that a service had already populated WITH a projection - so the
 * service-side projection never reached the client.
 */

const ALICE = '507f1f77bcf86cd799439021';
const BOB = '507f1f77bcf86cd799439022';
const GONE = '507f1f77bcf86cd799439023';

const CREDENTIALS = {
  password: '$pbkdf2$live-hash',
  salt: 'c0ffee',
  sessionInfo: [{ id: 's1', jwtPayload: { refresh: 'live-refresh' } }],
  authentications: [{ provider: 'google', props: { accessToken: 'live-oauth' } }],
  memberships: [{ clientId: 'partner', roles: ['ADMIN'] }],
};

const fullUser = (id: string, firstName: string) => ({
  _id: new ObjectId(id),
  firstName,
  lastName: 'Example',
  email: `${firstName.toLowerCase()}@example.com`,
  avatar: 'a.png',
  username: firstName.toLowerCase(),
  roles: ['USER'],
  ...CREDENTIALS,
});

/** A `User` model double whose `find` honours the projection it is given. */
const makeUserModel = (rows: any[]) => {
  const calls: Array<{ filter: any; select: string }> = [];
  const model = {
    calls,
    find: jest.fn((filter: any) => {
      const call = { filter, select: '' };
      calls.push(call);
      const chain: any = {
        select: (projection: string) => { call.select = projection; return chain; },
        lean: () => chain,
        exec: async () => {
          const wanted = new Set((filter._id.$in as string[]).map(String));
          const fields = call.select.split(' ').filter(Boolean);
          return rows
            .filter((row) => wanted.has(String(row._id)))
            .map((row) => (fields.length > 0 ? pickUserReference(row, fields) : row));
        },
      };
      return chain;
    }),
  };
  return model;
};

const LEAK = /live-hash|c0ffee|live-refresh|live-oauth|memberships|"salt"|"password"/;

describe('user reference projection constants', () => {
  it('exposes identity fields only', () => {
    expect(USER_REFERENCE_SELECT).toBe('_id firstName lastName email avatar username createdAt updatedAt');
    expect(USER_REFERENCE_WITH_ROLES_SELECT).toBe(`${USER_REFERENCE_SELECT} roles`);
    for (const secret of ['password', 'salt', 'sessionInfo', 'authentications', 'memberships']) {
      expect(USER_REFERENCE_WITH_ROLES_FIELDS).not.toContain(secret);
    }
  });

  it('cannot be mutated at runtime', () => {
    expect(Object.isFrozen(USER_REFERENCE_FIELDS)).toBe(true);
    expect(Object.isFrozen(USER_REFERENCE_WITH_ROLES_FIELDS)).toBe(true);
  });
});

describe('isPopulatedUser', () => {
  it('treats ids as unpopulated', () => {
    expect(isPopulatedUser(ALICE)).toBe(false);
    expect(isPopulatedUser(new ObjectId(ALICE))).toBe(false);
    expect(isPopulatedUser(null)).toBe(false);
    expect(isPopulatedUser(undefined)).toBe(false);
  });

  it('treats a mongoose ObjectId (whose _id getter returns itself) as unpopulated', () => {
    const { Types } = require('mongoose');
    expect(isPopulatedUser(new Types.ObjectId(ALICE))).toBe(false);
  });

  it('treats user objects as populated', () => {
    expect(isPopulatedUser(fullUser(ALICE, 'Alice'))).toBe(true);
  });
});

describe('resolveUserReferences', () => {
  it('loads ids in ONE projected query and preserves order, length and missing users', async () => {
    const User = makeUserModel([fullUser(ALICE, 'Alice'), fullUser(BOB, 'Bob')]);

    const result = await resolveUserReferences(User, [BOB, new ObjectId(ALICE), GONE, BOB]);

    expect(User.find).toHaveBeenCalledTimes(1);
    expect(User.calls[0].select).toBe(USER_REFERENCE_SELECT);
    expect(User.calls[0].filter._id.$in.sort()).toEqual([ALICE, BOB, GONE].sort());
    expect(result.map((u) => u && u.firstName)).toEqual(['Bob', 'Alice', null, 'Bob']);
    expect(JSON.stringify(result)).not.toMatch(LEAK);
  });

  it('narrows already-populated (full) users in memory without querying', async () => {
    const User = makeUserModel([]);

    const result = await resolveUserReferences(User, [fullUser(ALICE, 'Alice')], USER_REFERENCE_WITH_ROLES_FIELDS);

    expect(User.find).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ firstName: 'Alice', roles: ['USER'] });
    expect(JSON.stringify(result)).not.toMatch(LEAK);
  });

  it('narrows hydrated Mongoose documents through get()', async () => {
    const hydrated: any = { _id: new ObjectId(ALICE), get: (field: string) => (fullUser(ALICE, 'Alice') as any)[field] };
    const result = await resolveUserReferences(makeUserModel([]), [hydrated]);

    expect(result[0]).toMatchObject({ firstName: 'Alice', email: 'alice@example.com' });
    expect(JSON.stringify(result)).not.toMatch(LEAK);
  });

  it('handles a mix of populated users, ids and nulls', async () => {
    const User = makeUserModel([fullUser(BOB, 'Bob')]);

    const result = await resolveUserReferences(User, [fullUser(ALICE, 'Alice'), null, BOB]);

    expect(User.calls[0].filter._id.$in).toEqual([BOB]);
    expect(result.map((u) => u && u.firstName)).toEqual(['Alice', null, 'Bob']);
  });

  it('resolves malformed ids to null instead of failing the whole list', async () => {
    const User = makeUserModel([fullUser(ALICE, 'Alice')]);

    const result = await resolveUserReferences(User, ['not-an-id', ALICE]);

    expect(User.calls[0].filter._id.$in).toEqual([ALICE]);
    expect(result.map((u) => u && u.firstName)).toEqual([null, 'Alice']);
  });

  it('matches ids stored as uppercase hex strings', async () => {
    const User = makeUserModel([fullUser(ALICE, 'Alice')]);

    const result = await resolveUserReferences(User, [ALICE.toUpperCase()]);

    expect(result[0]).toMatchObject({ firstName: 'Alice' });
  });

  it('returns [] for an absent list without querying', async () => {
    const User = makeUserModel([]);

    expect(await resolveUserReferences(User, undefined)).toEqual([]);
    expect(await resolveUserReferences(User, [])).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();
  });
});

describe('resolveUserReference', () => {
  it('returns one projected user, or null', async () => {
    const User = makeUserModel([fullUser(ALICE, 'Alice')]);

    const alice = await resolveUserReference(User, ALICE);
    const nobody = await resolveUserReference(User, null);

    expect(alice).toMatchObject({ firstName: 'Alice' });
    expect(JSON.stringify(alice)).not.toMatch(LEAK);
    expect(nobody).toBeNull();
    expect(User.find).toHaveBeenCalledTimes(1);
  });
});
