# Membership role scoping (rollout notes)

## What changed

Partner roles now come from memberships only. Before this change, three behaviours together made an ADMIN of one partner (ReactoryClient) an ADMIN of every partner:

| Behaviour | Before | Now |
| --- | --- | --- |
| `UserService.createUserForOrganization` | Copied every granted role onto the user document (`user.roles`). | Records the grant on the membership only. Existing document roles are left as they are. |
| `User.hasRole` / `User.hasAnyRole` | Fell back to `user.roles` for **any** partner. | Use `user.roles` only for users with **no** memberships, and for the platform roles `SYSADMIN` / `SYSTEM`. |
| `ApiStatus.getRoles`, when the user has no roles in the current partner | Copied `user.roles` into a new, persisted membership of that partner. | Copies `user.roles` only for users with no memberships. Everyone else gets the partner's `new_user_roles` default (normally `USER`). |

Membership mutations are also scoped. `ReactoryCoreCreateUserMembership`, `ReactoryCoreRemoveUserMembership` and `ReactoryCoreCreateUserForApplication` require the caller to be one of:

- ADMIN in an enabled, partner-level membership of the **target** partner, or
- a system administrator (document-level `SYSADMIN` / `SYSTEM`).

Only a system administrator may grant `SYSADMIN` / `SYSTEM`. See `src/modules/reactory-core/utils/partnerAuthority.ts`.

`hasRole` also treats a role held higher up in the same partner as covering a narrower check:

- a partner-level role satisfies an organization- or business-unit-scoped check;
- an organization-level role satisfies a check for one of that organization's business units.

Before, the document fallback answered those checks.

## Who is affected

1. **Users who reached a partner only through document roles.** A user who has memberships, but whose access to some partner came from a role on the user document, loses that access. Their next login gives them the partner's default roles in place of the copied roles. This is the intended fix. Check that no legitimate administrator depends on it.
2. **Operators who manage users for other applications.** They now need ADMIN in that application (a partner-level membership) or document-level `SYSADMIN`. A plain ADMIN of the "reactory" partner can no longer create users or memberships in other partners.
3. **Users with no memberships at all**, such as the seeded sysadmin and legacy single-tenant accounts. Nothing changes for them. Their first visit to a partner still copies their document roles into a membership. From then on, other partners treat them like any member.

## Audit before deploying

Run these read-only queries against `reactory_users`.

Users whose document roles include something that no membership grants. These are the accounts whose effective access changes:

```js
db.reactory_users.aggregate([
  { $match: { 'memberships.0': { $exists: true }, roles: { $exists: true, $ne: [] } } },
  { $project: {
      email: 1,
      roles: 1,
      membershipRoles: { $reduce: { input: '$memberships.roles', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
  } },
  { $project: { email: 1, roles: 1, docOnly: { $setDifference: ['$roles', '$membershipRoles'] } } },
  { $match: { 'docOnly.0': { $exists: true } } },
])
```

Users holding a platform role. The new code trusts these in every partner, so confirm that each one is intentional:

```js
db.reactory_users.find({ roles: { $in: ['SYSADMIN', 'SYSTEM'] } }, { email: 1, roles: 1 })
```

Memberships that hold a platform role. These were only grantable through the old unscoped mutations; review them and remove them where they are not intended:

```js
db.reactory_users.find({ 'memberships.roles': { $in: ['SYSADMIN', 'SYSTEM'] } }, { email: 1, memberships: 1 })
```

ADMIN memberships created by the old `ApiStatus` copy for users who are members of several partners. Review these too: before this change, an ADMIN of one partner who opened another partner's app received an ADMIN membership there.

```js
db.reactory_users.find({ 'memberships.1': { $exists: true }, 'memberships.roles': 'ADMIN' }, { email: 1, memberships: 1 })
```

## Not changed

- `User.hasRole` still counts memberships whose `enabled` is `false`. `partnerAuthority` and the newer org-scoped helpers ignore them.
- `updateUser`, `deleteUser` and `ReactoryCoreUpdateUserSocials` let an ADMIN of the current partner act on any user id, including users of other partners.
- `OrganizationService.assertOrgAdmin` accepts a partner ADMIN for any organization id, without checking which partner the organization belongs to.

## Tests

The behaviour above is covered by these suites under `src/modules/reactory-core`:

- `resolvers/User/Membership/__tests__/UserMembershipResolver.tenantScope.test.ts`: the membership mutations and `partnerAuthority`.
- `models/__tests__/User.roles.test.ts`: `User.hasRole` and `User.hasAnyRole`.
- `resolvers/ApiStatus/ApiStatus.roleFallback.test.ts`: the `ApiStatus` role fallback.
- `services/__tests__/UserService.provisioningRoles.test.ts`: `createUserForOrganization` leaving document roles alone.
