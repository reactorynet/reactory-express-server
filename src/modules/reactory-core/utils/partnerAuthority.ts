import { InsufficientPermissions } from '@reactory/server-core/exceptions';
import { PLATFORM_ROLES } from './platformRoles';

export { PLATFORM_ROLES };

/**
 * Who may administer a partner's (ReactoryClient's) memberships.
 *
 * `@roles(['ADMIN'])` / `context.hasRole('ADMIN')` cannot answer that question:
 * they evaluate the partner the request arrived on, while these mutations take
 * the target `clientId` from their arguments. (They also used to accept an ADMIN
 * of any partner, through `User.hasRole`'s document-level fallback.) A mutation
 * that takes a `clientId` must therefore check the caller's own membership in
 * THAT partner.
 *
 * Authority comes from:
 *  - a platform system administrator (document-level SYSADMIN or SYSTEM - the
 *    seeded sysadmin account carries no memberships), or
 *  - an enabled, partner-level (no organization, no business unit) membership of
 *    the target partner that holds ADMIN.
 */

const ADMIN_ROLE = 'ADMIN';

const idOf = (value: any): string => String(value?._id ?? value ?? '');

export const isSystemAdministrator = (user: any): boolean =>
  Array.isArray(user?.roles) && user.roles.some((role: string) => PLATFORM_ROLES.includes(role));

export const isPartnerAdministrator = (user: any, partnerId: any): boolean => {
  const partner = idOf(partnerId);
  if (!user || partner.length === 0 || !Array.isArray(user.memberships)) return false;
  return user.memberships.some((membership: any) =>
    membership
    && membership.enabled !== false
    && idOf(membership.clientId) === partner
    && !membership.organizationId
    && !membership.businessUnitId
    && Array.isArray(membership.roles)
    && membership.roles.includes(ADMIN_ROLE));
};

export const canAdministerPartner = (user: any, partnerId: any): boolean =>
  isSystemAdministrator(user) || isPartnerAdministrator(user, partnerId);

/** Throws unless the caller may manage memberships of `partnerId`. */
export const assertCanAdministerPartner = (
  context: Reactory.Server.IReactoryContext,
  partnerId: any,
): void => {
  const user: any = context?.user;
  if (!user || !user._id) {
    throw new InsufficientPermissions('An authenticated user is required to manage memberships');
  }
  if (canAdministerPartner(user, partnerId)) return;
  throw new InsufficientPermissions(
    `User [${idOf(user)}] is not an administrator of partner [${idOf(partnerId)}]`,
    { partnerId: idOf(partnerId) },
  );
};

/**
 * Throws if `roles` includes a platform role and the caller is not a system
 * administrator. Without this a partner admin could grant SYSADMIN inside their
 * own partner, have it unioned into the grantee's document-level roles, and so
 * mint a platform administrator.
 */
export const assertCanGrantRoles = (
  context: Reactory.Server.IReactoryContext,
  roles: readonly string[] | null | undefined,
): void => {
  const privileged = (roles || []).filter((role) => PLATFORM_ROLES.includes(role));
  if (privileged.length === 0 || isSystemAdministrator(context?.user)) return;
  throw new InsufficientPermissions(
    `Only a system administrator may grant [${privileged.join(', ')}]`,
    { roles: privileged },
  );
};
