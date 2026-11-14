/**
 * SECURITY — `ApiStatus.getRoles` fallback for a user with no roles in the
 * current partner.
 *
 * It used to copy the user's document-level roles (the union of every partner's
 * roles) into a new, persisted membership of the current partner. An ADMIN of
 * partner B who opened partner A's app therefore became ADMIN of A. The copy
 * now happens only for users with no memberships at all; everyone else gets the
 * partner's `new_user_roles` default.
 */
import { ObjectId } from 'mongodb';
import { getRoles } from './ApiStatus';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({ enabled: [] }));

jest.mock('@reactory/server-core/amq', () => ({ raiseWorkFlowEvent: jest.fn() }));

const makeContext = (user: any, options: { defaultRoles?: string[]; failClients?: boolean } = {}) => {
  const partnerId = new ObjectId();
  const systemService = {
    getReactoryClients: options.failClients
      ? jest.fn().mockRejectedValue(new Error('clients unavailable'))
      : jest.fn().mockResolvedValue([]),
  };
  const context: any = {
    user,
    partner: {
      _id: partnerId,
      key: 'partner-a',
      name: 'Partner A',
      getSetting: jest.fn((key: string, defaultValue: any) => {
        if (key === 'login_partner_keys') {
          return { data: { partner_keys: ['partner-a'], defaultAction: 'add_default_membership', organization_excludes: [], organization_includes: [] } };
        }
        if (key === 'new_user_roles') return { data: options.defaultRoles ?? ['USER'] };
        return { data: defaultValue };
      }),
    },
    hasRole: jest.fn(() => false),
    hasAnyRole: jest.fn(() => false),
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn((fqn: string) => (fqn === 'core.SystemService@1.0.0' ? systemService : { acceptPendingInvitations: async () => 0 })),
  };
  return { context, partnerId };
};

const makeUser = (roles: string[], memberships: any[]) => ({
  _id: new ObjectId(),
  firstName: 'Some',
  lastName: 'One',
  email: 'some.one@example.com',
  roles,
  memberships,
  fullName: () => 'Some One',
  addRole: jest.fn().mockResolvedValue([]),
});

describe('ApiStatus.getRoles — no roles in the current partner', () => {
  it('gives a member of another partner only the default roles, never their document ADMIN', async () => {
    const user = makeUser(['USER', 'ADMIN'], [{ clientId: new ObjectId(), roles: ['USER', 'ADMIN'], enabled: true }]);
    const { context, partnerId } = makeContext(user);

    const { roles } = await getRoles(context);

    expect(roles).toEqual(['USER']);
    expect(user.addRole).toHaveBeenCalledTimes(1);
    expect(user.addRole).toHaveBeenCalledWith(partnerId, 'USER', null, null, context);
    expect(user.addRole).not.toHaveBeenCalledWith(expect.anything(), 'ADMIN', null, null, expect.anything());
  });

  it('still copies document roles for a user with no memberships at all (legacy / seeded accounts)', async () => {
    const user = makeUser(['USER', 'ADMIN'], []);
    const { context, partnerId } = makeContext(user);

    const { roles } = await getRoles(context);

    expect(roles.sort()).toEqual(['ADMIN', 'USER']);
    expect(user.addRole).toHaveBeenCalledWith(partnerId, 'ADMIN', null, null, context);
  });

  it('reports document-level platform roles in every partner', async () => {
    const sysadmin = makeUser(['SYSADMIN'], [{ clientId: new ObjectId(), roles: ['SYSADMIN'], enabled: true }]);
    const { context } = makeContext(sysadmin);

    const { roles } = await getRoles(context);

    expect(roles.sort()).toEqual(['SYSADMIN', 'USER']);
    // Reported, not persisted into this partner's membership.
    expect(sysadmin.addRole).not.toHaveBeenCalledWith(expect.anything(), 'SYSADMIN', null, null, expect.anything());
  });

  it('does not fall back to document roles on the error path for a member of another partner', async () => {
    const user = makeUser(['USER', 'ADMIN'], [{ clientId: new ObjectId(), roles: ['ADMIN'], enabled: true }]);
    const { context } = makeContext(user, { failClients: true });

    const { roles } = await getRoles(context);

    expect(roles).toEqual([]);
  });

  it('keeps the error-path fallback for a user with no memberships', async () => {
    const user = makeUser(['USER'], []);
    const { context } = makeContext(user, { failClients: true });

    const { roles } = await getRoles(context);

    expect(roles).toEqual(['USER']);
  });
});
