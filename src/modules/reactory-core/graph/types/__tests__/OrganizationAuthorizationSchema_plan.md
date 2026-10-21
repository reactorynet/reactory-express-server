# Test plan — Organization GraphQL surface (ORG-005)

**Test file:** `src/modules/reactory-core/graph/types/__tests__/OrganizationAuthorizationSchema.test.ts`

## Problem

`Organization.graphql` still published `@auth(roles: ["USER", "ADMIN"])` on
`createOrganization` and `updateOrganization`, so the GraphQL layer admitted any
authenticated `USER` before the resolver decorator or the service-level check
was consulted. `UpdateOrganizationInput` also lacked the identity, lifecycle and
branding fields the service now understands, and the new administration
mutations did not exist in the schema.

## Behaviour to lock down

1. `UpdateOrganizationInput` accepts `code`, `name`, `tradingName`, `legalName`,
   `description`, `website`, `contactEmail`, `contactPhone`, `status`, `theme`,
   `themeMode`, `public`, `avatar`, `logo`, `settings`, `legacyId`.
2. `createOrganization` is gated on `ADMIN` / `SYSTEM`; `updateOrganization` and
   every administration mutation is gated on
   `ORGANIZATION_ADMIN` / `ADMIN` / `SYSTEM`; none admits `USER`.
3. `archiveOrganization`, `restoreOrganization`, `OrganizationSetSetting`,
   `OrganizationRemoveSetting`, `addOrganizationMember`,
   `removeOrganizationMember` and `setOrganizationMemberRoles` exist with the
   arguments the service methods need, returning `Organization!`.
4. `OrganizationStatistics` is a flat type (`members`, `businessUnits`, `teams`)
   exposed by an `OrganizationStatistics(id: String!)` query available to
   `USER`.
5. No pre-existing query or mutation is removed or renamed.

## Notes

The test parses the SDL directly (no schema build), matching the ORG-004
`OrganizationThemeSchema.test.ts` approach: it proves the contract without
dragging in every core type or a database.
