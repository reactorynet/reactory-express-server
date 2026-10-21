# Test plan — OrganizationService org-scoped authorization (ORG-005)

**Test file:** `src/modules/reactory-core/services/__tests__/OrganizationAuthorization.test.ts`

## Problem

Organization mutations were protected only by coarse service-level
`@roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])` decorators. Those prove the
caller holds the role *somewhere*; they do not stop an `ORGANIZATION_ADMIN` of
organization A from mutating organization B. `createOrganization` also admitted
`ORGANIZATION_ADMIN`, which let an org admin bootstrap organizations beyond
their scope.

Separately, `getOrganizationsForLoggedInUser` called `.sort(direction)` on the
admin path (sorting by the literal `'asc'` / `'desc'` as a field name) and
ignored `direction` entirely on the membership path.

## Behaviour to lock down

1. `assertOrgAdmin` passes for `ADMIN` (any organization) and for
   `ORGANIZATION_ADMIN` **scoped to the target organization only**; everything
   else — including an unauthenticated user, a missing partner and an invalid
   organization id — throws.
2. Every organization-scoped mutation calls it: `updateOrganization`,
   `setOrganization`, `archiveOrganization`, `restoreOrganization`,
   `setSetting`, `removeSetting`, `addMember`, `removeMember`,
   `setMemberRoles` and the four ORG-004 theme mutations.
3. `create` requires `ADMIN` or `SYSTEM`; an `ORGANIZATION_ADMIN` is denied.
4. `getStatistics` returns accurate counts from one parallel round of
   aggregate queries (existence + one `countDocuments` per collection).
5. `setSetting` / `removeSetting` round-trip, including the first write on an
   empty `settings` array (the ORG-002 fix), exercised against the real model.
6. Membership writes live on `User.memberships`, keyed by client + organization,
   are idempotent on add, replace roles on set and remove only this
   organization's membership.
7. `getOrganizationsForLoggedInUser` sorts by the requested field **and**
   direction on both the admin and the membership path.

## Test cases

- **Authorization matrix** — the same table of 13 mutations is exercised three
  ways: `USER` denied; `ADMIN` allowed on *any* organization; `ORGANIZATION_ADMIN`
  of A allowed on A and denied on B (the core requirement, both directions).
- **Guard fall-through** — unauthenticated, missing partner, invalid id.
- **create** — USER denied, ORGANIZATION_ADMIN denied, ADMIN allowed (and the
  initial fields are applied), SYSTEM allowed, empty name rejected.
- **updateOrganization** — every identity field applied, `null` clears, unknown
  status / theme mode rejected, unspecified fields untouched.
- **archive / restore** — status flips, record retained (never hard deleted).
- **getStatistics** — counts asserted; each `countDocuments` called once;
  `findById` / `find` never called (proves no N+1).
- **settings** — real `Organization` model document with `save` stubbed: first
  write creates the entry, the second write replaces it, read-back and removal.
- **membership** — create, union roles on re-add, replace roles, remove only
  the matching client + organization, unknown user rejected.
- **sorting** — a fake query records the sort spec and applies it while being
  awaited, so the resulting order proves both field and direction.

Models are mocked except for the settings round-trip, which uses the actual
`Organization` model (no database connection is required: `save` is stubbed).

## Why these fail before the fix

Before ORG-005 the service only checked `context.hasRole('ORGANIZATION_ADMIN')`
(no organization argument), so the "ADMIN of A on B" cases resolved; `create`
accepted `ORGANIZATION_ADMIN`; there was no statistics/settings/membership
surface at all; and the admin list path sorted by a non-existent field.
