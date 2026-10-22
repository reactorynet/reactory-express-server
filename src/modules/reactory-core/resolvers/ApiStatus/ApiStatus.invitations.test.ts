/**
 * ORG-023 first-login invitation acceptance in `ApiStatus.getRoles`.
 *
 * This is the ONLY code that converts a pending organization invitation into a
 * real membership, and it sits inside a deliberate silent-failure catch - so it
 * needs its own tests. `getRoles` is exported for exactly this reason; the
 * memberships payload half of the contract is exercised through the
 * `ApiStatus.loggedInContext` resolver, which is the shape the client receives.
 *
 * The OrganizationService is stubbed: this file asserts the wiring (called
 * once, with the context user, roles visible on the same response, failure
 * swallowed). The conversion itself is covered against the real User model in
 * services/__tests__/OrganizationService.members.test.ts.
 */
import { ObjectId } from 'mongodb';
// Imported from the module file, not the `ApiStatus/index.ts` barrel: the barrel
// only re-exports the default, so `getRoles` would be undefined through it.
import ApiStatusResolver, { getRoles } from './ApiStatus';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-core/amq', () => ({
  raiseWorkFlowEvent: jest.fn(),
}));

/** Harvests the decorator-built resolver map, as MergeGraphResolvers does. */
const harvest = () => {
  const instance: any = Object.create((ApiStatusResolver as any).prototype);
  return instance.resolver;
};

interface IContextOptions {
  /** What acceptPendingInvitations does: resolve a count, or reject. */
  accept?: (user: any, context: any) => Promise<number>;
  /** Omit the method entirely to emulate a service that predates ORG-023. */
  omitAccept?: boolean;
  /** Extra roles granted on the membership the stub pushes. */
  acceptedRoles?: string[];
}

const makeContext = (options: IContextOptions = {}) => {
  const partnerId = new ObjectId();
  const organizationId = new ObjectId();

  const user: any = {
    _id: new ObjectId(),
    firstName: 'Invited',
    lastName: 'Person',
    email: 'invitee@example.com',
    roles: ['USER'],
    // A client-wide membership: this is what the existing login provisioning
    // path grants, and it is why `roles` is non-empty before acceptance.
    memberships: [
      {
        clientId: partnerId,
        organizationId: null,
        businessUnitId: null,
        roles: ['USER'],
        enabled: true,
      },
    ],
    fullName: () => 'Invited Person',
    addRole: jest.fn().mockResolvedValue([]),
  };

  const acceptPendingInvitations = jest.fn(
    options.accept
      ? options.accept
      : async (targetUser: any) => {
          // Mirrors the real service: the membership is pushed onto the same
          // user document the context holds, then the invitation is accepted.
          targetUser.memberships.push({
            clientId: partnerId,
            organizationId,
            businessUnitId: null,
            roles: ['USER', ...(options.acceptedRoles || ['ORGANIZATION_ADMIN'])],
            enabled: true,
            authProvider: 'invitation',
          });
          return 1;
        },
  );

  const organizationService: any = { acceptPendingInvitations };
  if (options.omitAccept === true) {
    delete organizationService.acceptPendingInvitations;
  }

  const systemService = {
    getReactoryClients: jest.fn().mockResolvedValue([]),
  };

  const context: any = {
    user,
    partner: {
      _id: partnerId,
      key: 'reactory',
      name: 'Reactory',
      getSetting: jest.fn((key: string, defaultValue: any) => {
        if (key === 'login_partner_keys') {
          return {
            data: {
              partner_keys: ['reactory'],
              defaultAction: 'add_default_membership',
              organization_excludes: [],
              organization_includes: [],
            },
          };
        }
        return { data: defaultValue };
      }),
    },
    hasRole: jest.fn(() => false),
    hasAnyRole: jest.fn(() => true),
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn((fqn: string) => {
      if (fqn === 'core.OrganizationService@1.0.0') return organizationService;
      if (fqn === 'core.SystemService@1.0.0') return systemService;
      return undefined;
    }),
  };

  return { context, user, partnerId, organizationId, acceptPendingInvitations, organizationService };
};

describe('ApiStatus.getRoles — ORG-023 first-login invitation acceptance', () => {
  it('calls acceptPendingInvitations once with the context user and the context', async () => {
    const { context, user, acceptPendingInvitations } = makeContext();

    await getRoles(context);

    expect(acceptPendingInvitations).toHaveBeenCalledTimes(1);
    expect(acceptPendingInvitations).toHaveBeenCalledWith(user, context);
  });

  it('surfaces the roles from the accepted membership on the same response', async () => {
    const { context, organizationId } = makeContext({
      acceptedRoles: ['ORGANIZATION_ADMIN'],
    });

    const result = await getRoles(context);

    expect(result.roles).toContain('ORGANIZATION_ADMIN');
    expect(result.roles).toContain('USER');
    // The accepted membership is visible to the root-partner role collection
    // without a second login.
    expect(
      context.user.memberships.some(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationId}`,
      ),
    ).toBe(true);
  });

  it('returns the accepted membership in the memberships payload (ApiStatus.loggedIn)', async () => {
    const { context, organizationId } = makeContext();
    const resolver = harvest();

    // The GraphQL property is `ApiStatus.loggedIn`; the method is named
    // `loggedInContext`.
    const result: any = await resolver.ApiStatus.loggedIn({}, {}, context);

    const organizationMembership = result.memberships.find(
      (m: any) => m.organizationId && m.organizationId === `${organizationId}`,
    );

    expect(organizationMembership).toBeDefined();
    expect(organizationMembership.roles).toEqual(['USER', 'ORGANIZATION_ADMIN']);
    expect(result.roles).toContain('ORGANIZATION_ADMIN');
    expect(result.user.roles).toContain('ORGANIZATION_ADMIN');
    expect(result.user.memberships).toEqual(result.memberships);
  });

  it('logs the acceptance and does not throw when invitations are accepted', async () => {
    const { context } = makeContext();

    await expect(getRoles(context)).resolves.toBeDefined();

    expect(context.log).toHaveBeenCalledWith(
      expect.stringContaining('Accepted 1 pending organization invitation'),
      expect.objectContaining({ acceptedInvitations: 1 }),
      'info',
      'ApiStatus:getRoles',
    );
  });

  it('still returns the normal roles when acceptPendingInvitations rejects', async () => {
    const { context } = makeContext({
      accept: async () => {
        throw new Error('organization service unavailable');
      },
    });

    // The catch is the silent-failure mode: it must not take login down.
    const result = await getRoles(context);

    expect(result.roles).toEqual(['USER']);
    expect(result.roles).not.toContain('ORGANIZATION_ADMIN');
    // The client-wide membership is untouched.
    expect(context.user.memberships).toHaveLength(1);
    expect(context.log).toHaveBeenCalledWith(
      expect.stringContaining('Failed to accept pending organization invitations'),
      expect.objectContaining({ error: expect.any(Error) }),
      'warn',
      'ApiStatus:getRoles',
    );
  });

  it('does not throw when the organization service has no acceptPendingInvitations', async () => {
    const { context } = makeContext({ omitAccept: true });

    const result = await getRoles(context);

    expect(result.roles).toEqual(['USER']);
    expect(context.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Failed to accept pending organization invitations'),
      expect.anything(),
      'warn',
      'ApiStatus:getRoles',
    );
  });

  it('does not log an acceptance when nothing was pending', async () => {
    const { context, acceptPendingInvitations } = makeContext({
      accept: async () => 0,
    });

    const result = await getRoles(context);

    expect(acceptPendingInvitations).toHaveBeenCalledTimes(1);
    expect(result.roles).toEqual(['USER']);
    expect(context.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Accepted'),
      expect.anything(),
      'info',
      'ApiStatus:getRoles',
    );
  });

  it('builds the log message from names or email when the user has no fullName helper', async () => {
    // The `getUserDisplayName` fallbacks live inside the ORG-023 block, so a
    // user document without `fullName` must still log cleanly.
    const withNames = makeContext();
    delete withNames.user.fullName;

    await getRoles(withNames.context);
    expect(withNames.context.log).toHaveBeenCalledWith(
      expect.stringContaining('Invited Person'),
      expect.anything(),
      'info',
      'ApiStatus:getRoles',
    );

    const withoutNames = makeContext();
    delete withoutNames.user.fullName;
    withoutNames.user.firstName = undefined;
    withoutNames.user.lastName = undefined;

    await getRoles(withoutNames.context);
    expect(withoutNames.context.log).toHaveBeenCalledWith(
      expect.stringContaining(withoutNames.user.email),
      expect.anything(),
      'info',
      'ApiStatus:getRoles',
    );
  });

  it('does not attempt acceptance for an anonymous caller', async () => {
    const { context, acceptPendingInvitations } = makeContext();
    context.user = {
      _id: 'ANON',
      firstName: 'Guest',
      lastName: 'User',
      email: 'anon@reactory.local',
      roles: ['ANON'],
      memberships: [],
      anon: true,
    };

    const result = await getRoles(context);

    expect(acceptPendingInvitations).not.toHaveBeenCalled();
    expect(result.roles).toEqual(['ANON']);
  });
});
