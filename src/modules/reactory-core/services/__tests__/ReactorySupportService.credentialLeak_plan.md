# TDD plan — support read paths must not serialise user credentials

Ticket: REACTORY-302016408/20261113/4225071849 (SECURITY, critical)

## Failure being pinned

`ReactorySupportService` populated user references without a projection, so every
support read returned the complete User document: `password` (PBKDF2), `salt`,
`sessionInfo[].jwtPayload.refresh` (live refresh token),
`authentications[].props.accessToken` (live OAuth token) and
`memberships[].roles`. `createRequest` / `updateTicket` additionally wrote the
whole `context.user` document into `createdBy` / `updatedBy`, leaking at insert
time with no populate involved.

## Unit under test

`src/modules/reactory-core/services/ReactorySupportService.ts`
(`getTicket`, `getTicketByReference`, `pagedRequest`, `createRequest`,
`updateTicket`, `addComment`, `getTicketComments`).

## Test strategy

The models are mocked (this repository has no live-Mongo unit harness) but the
mock is deliberately honest:

* a populate **without** `select` returns the complete user fixture, credentials
  included — i.e. the old behaviour;
* a populate **with** `select` applies that projection to the fixture.

So the assertions are about the value a caller receives, not about the fact that
`.select()` was called. The first test asserts that the fixture itself matches
`/pbkdf2$/`, `"salt":`, `"refresh":`, `"accessToken":` — without it, every other
assertion could pass vacuously.

## Cases

1. `getTicket` → `JSON.stringify(result)` matches none of the credential
   patterns, and `createdBy`/`assignedTo` still carry a name (the projection must
   not break the reader).
2. `getTicketByReference` → same.
3. `pagedRequest` (`listSupportTickets`) → same for the list envelope.
4. `createRequest` → the constructed document's `createdBy`/`updatedBy` are the
   caller's id, not an object; the returned ticket serialises no credentials.
5. `updateTicket` → `updatedBy` is the id; the response serialises no
   credentials.
6. `addComment` → the populated author is projected.
7. `getTicketComments` → author is `{ id, name }` only.
8. Structural: every user populate in `SUPPORT_TICKET_READ_POPULATE` (and the
   nested comment `user`) carries `USER_REFERENCE_SELECT`, which itself must not
   name password/salt/sessionInfo/authentications/memberships.

## Out of scope (asserted elsewhere)

* GraphQL SDL: `graph/types/__tests__/UserCredentialFields.test.ts`.
* `User.sessionInfo` / `authentications` gating:
  `resolvers/User/__tests__/UserResolver.credentials.test.ts`.
