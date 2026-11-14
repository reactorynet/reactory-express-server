import { ObjectId } from 'mongodb';
import UserModel from '../User';

/**
 * SECURITY — `User.hasRole` / `User.hasAnyRole` and document-level roles.
 *
 * Both methods used to end with a document-level fallback (`this.roles`), and
 * provisioning copied every membership's roles onto the document. Together that
 * made an ADMIN of one partner an ADMIN of every partner. Memberships are now
 * the only authority for users that have any; document roles count only for
 * users with no memberships and for the platform roles (SYSADMIN, SYSTEM).
 *
 * Runs against the real Mongoose model (no database: nothing is saved).
 */

const PARTNER_A = new ObjectId().toHexString();
const PARTNER_B = new ObjectId().toHexString();
const ORG = new ObjectId().toHexString();
const OTHER_ORG = new ObjectId().toHexString();
const BU = new ObjectId().toHexString();

const user = (memberships: any[], roles: string[] = []): any => new UserModel({
  firstName: 'Role',
  lastName: 'Test',
  email: 'role.test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  roles,
  memberships: memberships.map((m) => ({
    enabled: true,
    organizationId: null,
    businessUnitId: null,
    ...m,
  })),
} as any);

describe('User.hasRole', () => {
  it('denies an ADMIN of partner B in partner A even when the document carries ADMIN (the escalation)', () => {
    const adminOfB = user([{ clientId: PARTNER_B, roles: ['USER', 'ADMIN'] }], ['USER', 'ADMIN']);

    expect(adminOfB.hasRole(PARTNER_B, 'ADMIN')).toBe(true);
    expect(adminOfB.hasRole(PARTNER_A, 'ADMIN')).toBe(false);
    expect(adminOfB.hasRole(PARTNER_A, 'USER')).toBe(false);
  });

  it('uses document roles for a user with no memberships (seeded sysadmin, legacy accounts)', () => {
    const legacy = user([], ['USER', 'ADMIN']);

    expect(legacy.hasRole(PARTNER_A, 'ADMIN')).toBe(true);
    expect(legacy.hasRole(PARTNER_B, 'USER')).toBe(true);
    expect(legacy.hasRole(PARTNER_A, 'SUPPORT')).toBe(false);
  });

  it('honours document-level platform roles in every partner, even with memberships', () => {
    const sysadmin = user([{ clientId: PARTNER_A, roles: ['USER'] }], ['SYSADMIN']);

    expect(sysadmin.hasRole(PARTNER_B, 'SYSADMIN')).toBe(true);
    // ...but a platform role does not imply partner roles.
    expect(sysadmin.hasRole(PARTNER_B, 'ADMIN')).toBe(false);
  });

  it('lets a partner-level role satisfy organization- and business-unit-scoped checks in the same partner', () => {
    const partnerAdmin = user([{ clientId: PARTNER_A, roles: ['ADMIN'] }]);

    expect(partnerAdmin.hasRole(PARTNER_A, 'ADMIN', ORG)).toBe(true);
    expect(partnerAdmin.hasRole(PARTNER_A, 'ADMIN', ORG, BU)).toBe(true);
    expect(partnerAdmin.hasRole(PARTNER_B, 'ADMIN', ORG)).toBe(false);
  });

  it('lets an organization-level role cover that organization\'s business units, but not other organizations', () => {
    const orgAdmin = user([{ clientId: PARTNER_A, organizationId: ORG, roles: ['ORGANIZATION_ADMIN'] }]);

    expect(orgAdmin.hasRole(PARTNER_A, 'ORGANIZATION_ADMIN', ORG)).toBe(true);
    expect(orgAdmin.hasRole(PARTNER_A, 'ORGANIZATION_ADMIN', ORG, BU)).toBe(true);
    expect(orgAdmin.hasRole(PARTNER_A, 'ORGANIZATION_ADMIN', OTHER_ORG)).toBe(false);
    // A narrower role never answers a wider check.
    expect(orgAdmin.hasRole(PARTNER_A, 'ORGANIZATION_ADMIN')).toBe(false);
  });

  it('matches an exact business-unit membership', () => {
    const buAdmin = user([{ clientId: PARTNER_A, organizationId: ORG, businessUnitId: BU, roles: ['BUSINESS_UNIT_ADMIN'] }]);

    expect(buAdmin.hasRole(PARTNER_A, 'BUSINESS_UNIT_ADMIN', ORG, BU)).toBe(true);
    expect(buAdmin.hasRole(PARTNER_A, 'BUSINESS_UNIT_ADMIN', ORG)).toBe(false);
  });

  it('returns false for an invalid partner id', () => {
    expect(user([{ clientId: PARTNER_A, roles: ['USER'] }]).hasRole('not-an-id', 'USER')).toBe(false);
  });
});

describe('User.hasAnyRole', () => {
  it('is false for a partner the user holds no membership in, whatever the document says', () => {
    const memberOfB = user([{ clientId: PARTNER_B, roles: ['ADMIN'] }], ['ADMIN']);

    expect(memberOfB.hasAnyRole(PARTNER_B)).toBe(true);
    expect(memberOfB.hasAnyRole(PARTNER_A)).toBe(false);
  });

  it('still answers from the document for a user with no memberships', () => {
    expect(user([], ['USER']).hasAnyRole(PARTNER_A)).toBe(true);
    expect(user([], ['ANON']).hasAnyRole(PARTNER_A)).toBe(false);
  });
});
