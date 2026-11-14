/**
 * Platform-wide roles. They are not partner roles: the seeded system
 * administrator carries them on the user document and has no memberships, so
 * `User.hasRole` honours them from the document even for users that do have
 * memberships. Only a system administrator may grant them
 * (`partnerAuthority.assertCanGrantRoles`), and provisioning never copies them
 * from a membership onto the document.
 *
 * This module must not import anything: `models/User.ts` imports it.
 */
export const PLATFORM_ROLES: readonly string[] = Object.freeze(['SYSADMIN', 'SYSTEM']);
