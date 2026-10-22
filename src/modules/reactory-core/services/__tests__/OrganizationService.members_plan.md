# ORG-023 — Organization membership and roles API: test plan

Scope: `OrganizationService` membership surface only (`OrganizationMembers`,
`inviteOrganizationMember`, `deactivateOrganizationMember`,
`acceptPendingInvitations`). The ORG-005 mutations (`addMember`,
`setMemberRoles`, `removeMember`) already exist and are covered where this
ticket depends on their behaviour.

## Fixtures

- Real `User` model (as in `OrganizationService.teams.test.ts`) so
  `assertOrgAdmin` runs the shipped `hasRole` / membership semantics rather
  than a mock that encodes the intended answer.
- `clientId` is the request partner id; a client-wide membership has
  `organizationId: null`, an organization membership has the org id and
  `businessUnitId: null`.
- Mocked models: `User`, `Organization`, `BusinessUnit`, `Team`,
  `OrganizationInvitation`.

## Cases

### pagedOrganizationMembers
1. Requires org administration: plain `USER` is refused by the coarse gate.
2. Cross-organization admin is refused by `assertOrgAdmin` (negative test).
3. DB query requires an exact `organizationId` match, so client-wide
   memberships (`organizationId: null`) cannot match.
4. A user holding only a client-wide membership never becomes a row.
5. Default listing excludes deactivated memberships (`enabled: { $ne: false }`).
6. `includeDeactivated` / `status: 'deactivated'` / `deactivatedOnly` include
   them; the default query does not.
7. Role filter and enabled filter narrow the membership match.
8. Text search is case-insensitive across first name, last name and email and
   escapes regex metacharacters.
9. Paging envelope matches `pagedBusinessUnits` / `pagedTeams`
   (`page`, `pageSize`, `total`, `pageCount`, `hasNext`).
10. Rows are membership-shaped: membership id, roles, status, business unit
    ref, derived team refs, created / lastLogin.
11. Unknown organization and invalid ids are rejected.
12. Team filter resolves `Team.members`; unknown team is rejected.

### inviteOrganizationMember
13. Creates a pending invitation keyed by email for an address with no user
    account; returns an `invited` row; no `User` document is created.
14. An existing active member is rejected cleanly (no duplicate invitation).
15. An email with a deactivated membership is rejected with the re-activation
    pointer.
16. A duplicate pending invitation is rejected.
17. Invalid email and cross-organization admin are rejected.
18. A business unit from another organization / unknown is rejected.

### acceptPendingInvitations (first-login conversion)
19. A pending invitation becomes an active membership on the same user document
    and the invitation is marked `accepted`.
20. A repeat pass finds nothing pending and performs no write.
21. Invitations for a deleted/archived organization are skipped.
22. An existing client-wide membership is preserved while the org membership is
    added.

### deactivateOrganizationMember
23. Sets `enabled: false` on the organization membership and saves.
24. Never touches the client-wide membership (domain trap).
25. A user with no organization membership (only client-wide) is rejected.
26. Cross-organization admin is rejected.
27. `removeOrganizationMember` still hard-removes the org membership and leaves
    the client-wide one intact.

### Authorization freshness
28. A role change on the persisted membership is picked up by the very next
    `assertOrgAdmin` call on the same service instance (no token re-issue).
29. Deactivating an admin membership immediately removes their admin authority.

### Filter paths (review QA-2)
30. `filter.enabled: true` sets `enabled: true` on the membership match;
    `filter.enabled: false` sets `false`.
31. `filter.businessUnitId` (valid) becomes an ObjectId in the membership match
    and the row carries the resolved unit; an invalid id is rejected before any
    user query runs.
32. `status: 'invited'` combined with `search`, `role` and `businessUnitId`
    narrows the invitation query (escaped email regex, roles, ObjectId) and the
    row carries the resolved unit.
33. An invalid `businessUnitId` on the invited listing is rejected before the
    invitation query runs.
34. An invalid `teamId` is rejected before the team or user query runs.
35. `inviteOrganizationMember` with a valid `businessUnitId` looks the unit up
    scoped to the organization and excluding deleted units, stores the ObjectId
    on the invitation, and returns the resolved unit on the pending row.
36. `acceptPendingInvitations` adopts the invited business unit when the
    existing (deactivated) membership has none.

## ApiStatus.getRoles — first-login hook (review QA-1)

Separate file: `resolvers/ApiStatus/ApiStatus.invitations.test.ts`. The
OrganizationService is stubbed; the conversion itself is covered above against
the real `User` model.

37. `acceptPendingInvitations` is called exactly once with the context user and
    the context.
38. Roles from the accepted membership appear in the returned `roles` on the
    same response.
39. The accepted membership appears in the `memberships` payload of the
    `ApiStatus.loggedIn` resolver, in both `memberships` and `user.roles`.
40. Acceptance is logged at info level with the accepted count.
41. When `acceptPendingInvitations` rejects, `getRoles` still resolves with the
    normal roles, leaves the client-wide membership untouched, and logs a
    warning (the silent-failure catch must not take login down).
42. A service without `acceptPendingInvitations` does not throw and does not log
    a failure.
43. A zero count (nothing pending) does not log an acceptance.
44. An anonymous caller never triggers acceptance.
45. The display-name fallbacks inside the block work for a user document with
    no `fullName` helper (names, then email).


## Payload contract / nullability (review cycle 1, B-1)

Separate file: `graph/types/__tests__/OrganizationMembersNullability.test.ts`.
SDL parsing cannot see a payload that fails its declared type, so this builds an
executable schema with `makeExecutableSchema` from the REAL SDL declarations and
runs a real query through `graphql()`.

46. Default field resolver: a row produced by the real
    `pagedOrganizationMembers` mapper resolves
    `user { id firstName lastName email avatar }` and `teams { id name }` with
    no errors, and the values match the fixture.
47. Same query with the real User/Team property resolvers merged resolves
    without errors (runtime-schema compatibility).
48. Negative control: the pre-fix payload shape (only `_id`, no `id`) produces
    `Cannot return null for non-nullable field User.id` and `... Team.id`, so the
    test provably fails if the payload regresses.
