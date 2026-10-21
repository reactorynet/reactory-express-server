# Test plan — OrganizationResolver authorization and image URLs (ORG-002)

**Test file:** `src/modules/reactory-core/resolvers/Organization/__tests__/OrganizationResolver.test.ts`

## Problem

The `Organization.graphql` mutations were gated only at `@auth(roles: ["USER","ADMIN"])`,
and the resolver methods carried no `@roles` decorator. Any authenticated `USER`
could therefore call `createOrganization` or `updateOrganization`.

Separately, `logoURL` / `avatarURL` built their cache-busting token with
`moment().format('YYYMMDDhh')`, which is not a valid moment format (three year
tokens and a 12-hour clock), so the query string was effectively constant.

## Behaviour to lock down

1. `createOrganization` and `updateOrganization` reject a `USER`-only caller with
   `InsufficientPermissions` and never reach the organization service.
2. `ORGANIZATION_ADMIN` / `ADMIN` callers pass and reach the service.
3. `logoURL` returns a CDN URL whose `?t=` token is exactly
   `moment().format('YYYYMMDDHH')` (10 digits) and never contains the literal
   format string.
4. `avatarURL` prefers the avatar alias and falls back to the logo alias.

## Notes

- `MergeGraphResolvers` harvests resolver maps from the class prototype and
  merges them into a plain object, so the tests call the harvested functions
  detached from the class (same approach as
  `ReactoryContentResolver.binding.test.ts`).
- The `@roles` wrapper throws **synchronously**, so denial assertions use
  `expect(() => ...).toThrow(...)` rather than `rejects`.

## Verification

```bash
./bin/jest.sh reactory local 'OrganizationResolver'
```
