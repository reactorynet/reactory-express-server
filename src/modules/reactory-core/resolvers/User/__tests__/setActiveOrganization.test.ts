/**
 * `setActiveOrganization` — the server-side write path for a user's active
 * organization.
 *
 * The active organization used to be browser-local (`localStorage`), so it
 * followed one device and every other surface kept reporting the organization
 * stored on the account. This mutation writes `user.organization`, the exact
 * field `ApiStatus.getApiStatus` projects into its `organization` result
 * (`resolvers/ApiStatus/ApiStatus.ts`), so the switch is visible to every
 * consumer that already reads the status query.
 *
 * These tests pin the rules that make that write safe:
 *
 *   * the target is always the *caller* — no argument can redirect the write;
 *   * only an enabled membership of the target organization, in the request's
 *     tenant, is accepted;
 *   * "not an id", "no such organization" and "not a member" are three
 *     different, typed answers, and each one is decided before the write;
 *   * a refused switch leaves the previous active organization untouched.
 *
 * A real `User` document is used (no database connection, `save` is stubbed) so
 * membership subdocuments are cast by the real schema and the assertions are
 * made against the shape the server actually stores.
 */
import { ObjectId } from 'mongodb';
import UserModel from '@reactory/server-modules/reactory-core/models/User';
import UserResolver from '../UserResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const invoke = async (args: any, context: any) => {
  const instance: any = Object.create((UserResolver as any).prototype);
  return instance.setActiveOrganization({}, args, context);
};

interface FixtureOptions {
  /** Organization the caller's single membership points at. Defaults to the target. */
  membershipOrganizationId?: ObjectId;
  /** Tenant the caller's membership belongs to. Defaults to the request tenant. */
  membershipClientId?: ObjectId;
  /** Whether that membership is enabled. */
  membershipEnabled?: boolean;
  /** Override the organization lookup result (null models "no such organization"). */
  organization?: { _id: any; name?: string; logo?: string } | null;
}

/**
 * Builds a caller with a real `User` document, a partner (tenant) and a service
 * double that answers the two lookups the resolver makes.
 */
const fixture = (options: FixtureOptions = {}) => {
  const partnerId = new ObjectId();
  const organizationId = new ObjectId();
  const previousOrganizationId = new ObjectId();

  const organization =
    options.organization === undefined
      ? { _id: organizationId, name: 'Acme Holdings', logo: 'acme.png' }
      : options.organization;

  const user: any = new UserModel({
    _id: new ObjectId(),
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    salt: 'salt',
    password: 'hash',
    organization: previousOrganizationId,
    memberships: [
      {
        clientId: options.membershipClientId || partnerId,
        organizationId: options.membershipOrganizationId || organizationId,
        enabled: options.membershipEnabled === undefined ? true : options.membershipEnabled,
      },
    ],
  });
  user.save = jest.fn().mockResolvedValue(user);

  const findUserById = jest.fn().mockResolvedValue(user);
  const findOrganizationById = jest.fn().mockResolvedValue(organization);

  const context: any = {
    user,
    partner: { _id: partnerId },
    hasRole: jest.fn(() => true),
    log: jest.fn(),
    getService: jest.fn(() => ({ findUserById, findOrganizationById })),
  };

  return {
    user,
    partnerId,
    organizationId: `${organizationId}`,
    previousOrganizationId: `${previousOrganizationId}`,
    organization,
    findUserById,
    findOrganizationById,
    context,
  };
};

const codeOf = async (promise: Promise<any>): Promise<string | undefined> => {
  try {
    await promise;
  } catch (error) {
    return (error as any)?.extensions?.code;
  }
  return undefined;
};

describe('setActiveOrganization', () => {
  it("writes the caller's organization and returns that organization", async () => {
    const { user, organizationId, organization, context } = fixture();

    const result = await invoke({ organizationId }, context);

    expect(`${user.organization}`).toBe(organizationId);
    expect(user.save).toHaveBeenCalledTimes(1);
    // The Organization document comes back so the client can re-resolve
    // branding (`id`, `name`, `logo`) without a second round trip.
    expect(result).toBe(organization);
    expect(result).toMatchObject({ name: 'Acme Holdings', logo: 'acme.png' });
  });

  it('leaves the value ApiStatus projects (user.organization) pointing at the new organization', async () => {
    const { user, organizationId, context } = fixture();

    await invoke({ organizationId }, context);

    // ApiStatus.getApiStatus builds its payload with
    // `organization: user ? user.organization : null`. Reading it off the
    // persisted document is exactly what a subsequent status query returns.
    expect(`${user.organization}`).toBe(organizationId);
  });

  it('refuses an organization the caller is not a member of, and writes nothing', async () => {
    const { user, organizationId, previousOrganizationId, context } = fixture({
      membershipOrganizationId: new ObjectId(),
    });

    await expect(invoke({ organizationId }, context)).rejects.toMatchObject({
      extensions: { code: 'ORGANIZATION_MEMBERSHIP_REQUIRED' },
    });

    expect(user.save).not.toHaveBeenCalled();
    expect(`${user.organization}`).toBe(previousOrganizationId);
  });

  it('refuses a deactivated membership', async () => {
    const { user, organizationId, previousOrganizationId, context } = fixture({
      membershipEnabled: false,
    });

    await expect(invoke({ organizationId }, context)).rejects.toMatchObject({
      extensions: { code: 'ORGANIZATION_MEMBERSHIP_REQUIRED' },
    });

    expect(user.save).not.toHaveBeenCalled();
    expect(`${user.organization}`).toBe(previousOrganizationId);
  });

  it('does not let a membership held in another tenant authorise this session', async () => {
    // Same organization, enabled membership — but for a different client.
    const { user, organizationId, previousOrganizationId, context } = fixture({
      membershipClientId: new ObjectId(),
    });

    await expect(invoke({ organizationId }, context)).rejects.toMatchObject({
      extensions: { code: 'ORGANIZATION_MEMBERSHIP_REQUIRED' },
    });

    expect(user.save).not.toHaveBeenCalled();
    expect(`${user.organization}`).toBe(previousOrganizationId);
  });

  it('rejects a well formed id that names no organization, distinctly from "not a member"', async () => {
    const { user, organizationId, previousOrganizationId, context } = fixture({ organization: null });

    await expect(invoke({ organizationId }, context)).rejects.toMatchObject({
      extensions: { code: 'ORGANIZATION_NOT_FOUND', organizationId },
    });

    expect(user.save).not.toHaveBeenCalled();
    expect(`${user.organization}`).toBe(previousOrganizationId);
  });

  it('rejects a malformed id before looking anything up, distinctly from "unknown"', async () => {
    const { findOrganizationById, context } = fixture();

    // `ObjectId.isValid` accepts any 12 byte string, so a 12 character value is
    // a malformed id, not a missing record. Each of these must be refused as an
    // id problem and must not reach the database.
    const malformed = ['not-an-id', 'abcdefghijkl', '', '   ', '12345'];

    for (const organizationId of malformed) {
      expect(await codeOf(invoke({ organizationId }, context))).toBe('ORGANIZATION_ID_INVALID');
    }

    expect(await codeOf(invoke({ organizationId: null }, context))).toBe('ORGANIZATION_ID_INVALID');
    expect(await codeOf(invoke({ organizationId: 12345 }, context))).toBe('ORGANIZATION_ID_INVALID');
    expect(findOrganizationById).not.toHaveBeenCalled();
  });

  it('matches the membership by the canonical stored id, not the spelling of the argument', async () => {
    const { user, organizationId, context } = fixture();

    await invoke({ organizationId: organizationId.toUpperCase() }, context);

    // Object ids are canonically lower case hex; an upper case spelling of the
    // same id must not look like a different organization.
    expect(`${user.organization}`).toBe(organizationId);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it('refuses an unauthenticated caller', async () => {
    const { findUserById, findOrganizationById, context } = fixture();
    context.user = null;

    expect(await codeOf(invoke({ organizationId: `${new ObjectId()}` }, context))).toBe('UNAUTHENTICATED');
    expect(findUserById).not.toHaveBeenCalled();
    expect(findOrganizationById).not.toHaveBeenCalled();
  });

  it('refuses when the session names a user that no longer exists', async () => {
    const { user, findUserById, organizationId, context } = fixture();
    findUserById.mockResolvedValue(null);

    expect(await codeOf(invoke({ organizationId }, context))).toBe('UNAUTHENTICATED');
    expect(user.save).not.toHaveBeenCalled();
  });

  it("only ever writes the caller's document, even when a user id is supplied", async () => {
    const { user, organizationId, findUserById, context } = fixture();

    const other: any = new UserModel({
      _id: new ObjectId(),
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      salt: 'salt',
      password: 'hash',
      organization: new ObjectId(),
      memberships: [{ clientId: context.partner._id, organizationId, enabled: true }],
    });
    other.save = jest.fn().mockResolvedValue(other);
    const otherOrganizationBefore = `${other.organization}`;

    // The schema takes no user id; extra arguments must not become a target.
    await invoke({ organizationId, userId: `${other._id}`, id: `${other._id}` }, context);

    expect(`${user.organization}`).toBe(organizationId);
    expect(other.save).not.toHaveBeenCalled();
    expect(`${other.organization}`).toBe(otherOrganizationBefore);
    // The lookup is keyed by the session user, never by an argument.
    expect(findUserById).toHaveBeenCalledWith(`${user._id}`);
  });

  it('uses three distinct codes so the client can pick the right message', async () => {
    const notAMember = fixture({ membershipOrganizationId: new ObjectId() });
    const unknown = fixture({ organization: null });
    const malformed = fixture();

    const codes = [
      await codeOf(invoke({ organizationId: notAMember.organizationId }, notAMember.context)),
      await codeOf(invoke({ organizationId: unknown.organizationId }, unknown.context)),
      await codeOf(invoke({ organizationId: 'nope' }, malformed.context)),
    ];

    expect(new Set(codes).size).toBe(3);
    expect(codes).toEqual([
      'ORGANIZATION_MEMBERSHIP_REQUIRED',
      'ORGANIZATION_NOT_FOUND',
      'ORGANIZATION_ID_INVALID',
    ]);
  });
});
