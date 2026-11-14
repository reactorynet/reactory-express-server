import { ObjectId } from 'mongodb';
import UserMembershipResolver from '../UserMembershipResolver';
import UserResolver from '../../UserResolver';
import {
  assertCanGrantRoles,
  canAdministerPartner,
  isPartnerAdministrator,
  isSystemAdministrator,
} from '@reactory/server-modules/reactory-core/utils/partnerAuthority';

/**
 * SECURITY — cross-tenant ADMIN escalation through membership mutations.
 *
 * `ReactoryCoreCreateUserMembership`, `ReactoryCoreRemoveUserMembership` and
 * `ReactoryCoreCreateUserForApplication` were guarded only by `@roles(['ADMIN'])`.
 * That gate is satisfied by an ADMIN of ANY partner (`User.hasRole` falls back to
 * the document-level `roles`, which aggregate every partner), and the mutations
 * take the target `clientId` from their arguments - so a tenant admin could grant
 * themselves ADMIN in another tenant, or strip another tenant's memberships.
 */

const PARTNER_A = new ObjectId().toHexString();
const PARTNER_B = new ObjectId().toHexString();
const ORG = new ObjectId().toHexString();
const CALLER_ID = new ObjectId().toHexString();
const TARGET_ID = new ObjectId().toHexString();

type MembershipSpec = { clientId: string; roles: string[]; enabled?: boolean; organizationId?: string | null; businessUnitId?: string | null };

const caller = (memberships: MembershipSpec[], documentRoles: string[] = []) => ({
  _id: new ObjectId(CALLER_ID),
  roles: documentRoles,
  memberships: memberships.map((m) => ({
    _id: new ObjectId(),
    enabled: true,
    organizationId: null,
    businessUnitId: null,
    ...m,
    clientId: new ObjectId(m.clientId),
  })),
});

const makeTarget = (memberships: MembershipSpec[] = []) => {
  const target: any = {
    _id: new ObjectId(TARGET_ID),
    memberships: memberships.map((m) => ({ _id: new ObjectId(), enabled: true, ...m, clientId: new ObjectId(m.clientId) })),
    save: jest.fn(async () => target),
    getMembership: jest.fn(() => null),
  };
  return target;
};

const makeContext = (user: any, partnerId = PARTNER_A, target: any = makeTarget()) => {
  const userService = {
    findUserById: jest.fn(async () => target),
    removeUserMembership: jest.fn(async () => ({ success: true, message: 'Membership removed' })),
    createUserForOrganization: jest.fn(async () => ({ user: { _id: target._id } })),
  };
  const systemService = { getReactoryClient: jest.fn(async (id: string) => ({ _id: id })) };
  const context: any = {
    user,
    partner: { _id: new ObjectId(partnerId) },
    // Mirrors User.hasRole's document-level fallback: any ADMIN anywhere passes.
    hasRole: () => true,
    log: jest.fn(),
    getService: (id: string) => (id.startsWith('core.UserService') ? userService : systemService),
  };
  return { context, userService, systemService, target };
};

const membershipResolver = (): any => Object.create((UserMembershipResolver as any).prototype);
const userResolver = (): any => Object.create((UserResolver as any).prototype);

describe('partnerAuthority', () => {
  it('recognises a partner admin only through an enabled, partner-level ADMIN membership', () => {
    expect(isPartnerAdministrator(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]), PARTNER_A)).toBe(true);
    expect(isPartnerAdministrator(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]), PARTNER_B)).toBe(false);
    expect(isPartnerAdministrator(caller([{ clientId: PARTNER_A, roles: ['ADMIN'], enabled: false }]), PARTNER_A)).toBe(false);
    expect(isPartnerAdministrator(caller([{ clientId: PARTNER_A, roles: ['ADMIN'], organizationId: ORG }]), PARTNER_A)).toBe(false);
    expect(isPartnerAdministrator(caller([{ clientId: PARTNER_A, roles: ['USER'] }]), PARTNER_A)).toBe(false);
  });

  it('ignores document-level ADMIN (it aggregates every partner)', () => {
    expect(canAdministerPartner(caller([], ['ADMIN']), PARTNER_A)).toBe(false);
  });

  it('treats document-level SYSADMIN / SYSTEM as platform authority', () => {
    expect(isSystemAdministrator(caller([], ['SYSADMIN']))).toBe(true);
    expect(isSystemAdministrator(caller([], ['SYSTEM']))).toBe(true);
    expect(canAdministerPartner(caller([], ['SYSADMIN']), PARTNER_B)).toBe(true);
  });

  it('lets only a system administrator grant platform roles', () => {
    const partnerAdmin = { user: caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]) } as any;
    const sysadmin = { user: caller([], ['SYSADMIN']) } as any;

    expect(() => assertCanGrantRoles(partnerAdmin, ['USER', 'ADMIN'])).not.toThrow();
    expect(() => assertCanGrantRoles(partnerAdmin, ['SYSADMIN'])).toThrow(/system administrator/);
    expect(() => assertCanGrantRoles(partnerAdmin, ['SYSTEM'])).toThrow(/system administrator/);
    expect(() => assertCanGrantRoles(sysadmin, ['SYSADMIN'])).not.toThrow();
  });
});

describe('ReactoryCoreCreateUserMembership', () => {
  it('refuses an ADMIN of partner A granting ADMIN in partner B (the escalation)', async () => {
    const { context, target } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    await expect(membershipResolver().createUserMembership(null, { user_id: TARGET_ID, clientId: PARTNER_B, roles: ['ADMIN'] }, context))
      .rejects.toThrow(/not an administrator of partner/);
    expect(target.save).not.toHaveBeenCalled();
    expect(target.memberships).toHaveLength(0);
  });

  it('refuses a caller whose ADMIN is only document-level', async () => {
    const { context, target } = makeContext(caller([{ clientId: PARTNER_A, roles: ['USER'] }], ['ADMIN']));

    await expect(membershipResolver().createUserMembership(null, { user_id: TARGET_ID, roles: ['ADMIN'] }, context))
      .rejects.toThrow(/not an administrator/);
    expect(target.save).not.toHaveBeenCalled();
  });

  it('refuses a partner admin granting SYSADMIN, even in their own partner', async () => {
    const { context, target } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    await expect(membershipResolver().createUserMembership(null, { user_id: TARGET_ID, clientId: PARTNER_A, roles: ['SYSADMIN'] }, context))
      .rejects.toThrow(/system administrator/);
    expect(target.save).not.toHaveBeenCalled();
  });

  it('allows a partner admin to grant roles in their own partner (default clientId = current partner)', async () => {
    const { context, target } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    const membership = await membershipResolver().createUserMembership(null, { user_id: TARGET_ID, roles: ['ADMIN'] }, context);

    expect(target.save).toHaveBeenCalled();
    expect(String(membership.clientId)).toBe(PARTNER_A);
    expect(membership.roles).toEqual(['ADMIN']);
  });

  it('allows a system administrator to act on any partner', async () => {
    const { context, target } = makeContext(caller([], ['SYSADMIN']));

    await membershipResolver().createUserMembership(null, { user_id: TARGET_ID, clientId: PARTNER_B, roles: ['ADMIN'] }, context);

    expect(target.save).toHaveBeenCalled();
  });

  it('rejects a malformed clientId before touching the user', async () => {
    const { context, userService } = makeContext(caller([], ['SYSADMIN']));

    await expect(membershipResolver().createUserMembership(null, { user_id: TARGET_ID, clientId: 'not-an-id' }, context))
      .rejects.toThrow(/Invalid clientId/);
    expect(userService.findUserById).not.toHaveBeenCalled();
  });
});

describe('ReactoryCoreRemoveUserMembership', () => {
  it('refuses removing a membership of a partner the caller does not administer', async () => {
    const target = makeTarget([{ clientId: PARTNER_B, roles: ['ADMIN'] }]);
    const { context, userService } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]), PARTNER_A, target);

    await expect(membershipResolver().removeUserMembership(null, { user_id: TARGET_ID, id: String(target.memberships[0]._id) }, context))
      .rejects.toThrow(/not an administrator of partner/);
    expect(userService.removeUserMembership).not.toHaveBeenCalled();
  });

  it('allows removing a membership of the caller\'s own partner', async () => {
    const target = makeTarget([{ clientId: PARTNER_A, roles: ['USER'] }]);
    const { context, userService } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]), PARTNER_A, target);

    const result = await membershipResolver().removeUserMembership(null, { user_id: TARGET_ID, id: String(target.memberships[0]._id) }, context);

    expect(result.success).toBe(true);
    expect(userService.removeUserMembership).toHaveBeenCalledWith(TARGET_ID, String(target.memberships[0]._id));
  });

  it('reports a missing membership without calling the service', async () => {
    const { context, userService } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    const result = await membershipResolver().removeUserMembership(null, { user_id: TARGET_ID, id: new ObjectId().toHexString() }, context);

    expect(result.success).toBe(false);
    expect(userService.removeUserMembership).not.toHaveBeenCalled();
  });
});

describe('ReactoryCoreCreateUserForApplication', () => {
  const input = { email: 'someone@example.com', firstName: 'Some', lastName: 'One' };

  it('refuses an ADMIN of partner A adding a membership in partner B (existing emails get a membership)', async () => {
    const { context, userService } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    await expect(userResolver().ReactoryCoreCreateUserForApplication(null, { input, clientId: PARTNER_B, roles: ['ADMIN'] }, context))
      .rejects.toThrow(/not an administrator of partner/);
    expect(userService.createUserForOrganization).not.toHaveBeenCalled();
  });

  it('refuses granting platform roles', async () => {
    const { context, userService } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    await expect(userResolver().ReactoryCoreCreateUserForApplication(null, { input, clientId: PARTNER_A, roles: ['SYSTEM'] }, context))
      .rejects.toThrow(/system administrator/);
    expect(userService.createUserForOrganization).not.toHaveBeenCalled();
  });

  it('allows a partner admin to create users for their own partner', async () => {
    const { context, userService } = makeContext(caller([{ clientId: PARTNER_A, roles: ['ADMIN'] }]));

    await userResolver().ReactoryCoreCreateUserForApplication(null, { input, clientId: PARTNER_A, roles: ['USER'] }, context);

    expect(userService.createUserForOrganization).toHaveBeenCalled();
  });
});
