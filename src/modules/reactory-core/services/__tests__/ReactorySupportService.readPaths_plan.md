# TOOLS-001 — expose ticket comments and attachments on the read paths

## Problem

`ReactorySupportService.getTicket()` / `getTicketByReference()` returned the raw
ticket document, so `comments` and `documents` were arrays of ObjectIds. An agent
(or a person) reading a ticket could not see the conversation or name an
attachment. There was also no method that returned the conversation in a usable
shape, even though `addComment` already populated the author after a write.

## Contract to pin down with tests

1. `getTicket` / `getTicketByReference` populate `createdBy`, `assignedTo`,
   `updatedBy`, `documents`, and `comments` **with each comment's `user`** — one
   named populate list, not duplicated strings.
2. `getTicketComments(ticketId)` returns a flat transcript ordered
   `createdAt` ascending, each entry `{ id, text, createdAt, author: { id, name },
   parentId, attachments[] }`, with replies identified by an explicit
   `parentId`.
3. `listTicketDocuments(ticketId)` returns `{ id, filename, alias, url, size,
   mimetype }` from the real `CoreFile` fields, in attachment order.
4. All three call the existing `assertCanViewTicket`; a caller who may not view
   the ticket is rejected before any comment/file query runs.
5. `pagedRequest` keeps its lean projection (`createdBy`, `assignedTo` only).

## Test strategy

Follow `ReactorySupportService.getTicketByReference.test.ts`: the model modules
are `jest.mock`ed and the query mock is chainable. `populate` is *simulated*
against the fixture (refs are swapped for documents, comment `options.sort` is
applied) so the assertions are about the value a caller receives rather than
about a mock having been called.

Cases:

- `getTicket`: comment authors are names, documents are documents, people are
  documents.
- `getTicketByReference`: same populate list as `getTicket`.
- `getTicketComments`: order, author names, `parentId` on the reply, both
  attachment shapes (id in `metadata.attachments`, `{ fileId }` wrapper) resolved
  in one file query; empty transcript short-circuits.
- `listTicketDocuments`: resolved metadata, attachment order preserved, empty
  list short-circuits.
- Permissions: stranger rejected on all three; creator/support still allowed.
- `pagedRequest`: does not populate `comments` or `documents`.

## Review round 1 additions

- `getTicketComments` now excludes `removed: true` comments, matching the platform default
  (`getCommentsByContext` / the ticket details field). The mock honours the `removed` predicate so the
  moderated fixture is genuinely filtered, not merely asserted about.
- The populated-comments branch of `SupportResolver.comments` is pinned by a new resolver suite
  (`resolvers/Support/__tests__/SupportResolver.comments.test.ts`): roots only, `removed` hidden, newest
  first — the same projection the query branch produces.

## Notes / non-goals

- The `Comment` schema has no first-class attachment field, so comment
  attachments are read from `metadata.attachments` (accepting ids, `{ fileId }`
  wrappers or populated file docs). No schema change is made here.
- No list endpoint gains comment bodies.
