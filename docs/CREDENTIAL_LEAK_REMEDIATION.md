# Credential leak remediation — remediation record

**Reference:** REACTORY-302016408/20261113/291469157
**Opened:** 2026-11-13
**Status:** code fixes in review; rotation outstanding

This document records the remediation of a credential-exposure defect so that the reasoning
survives the pull requests. It is not a runbook — the operational procedure for rotating
credentials lives in `reactory-docs` at `07-reference/runbooks/credential-rotation.md`.

## The defect

AI tool results (macros) serialised **entire `User` documents** rather than the handful of fields a
caller needs. A single support-ticket read returned, for every referenced user, the PBKDF2 password
hash, the salt, `sessionInfo[].jwtPayload.refresh` and the provider OAuth access tokens.

Two properties made this worse than an ordinary over-fetch:

1. **The egress includes an external service.** Tool results are sent to the model provider.
2. **The egress is persisted.** Tool results are written into conversation history, and oversized
   payloads are additionally offloaded to `*-output-*.json` files in the agent workspace.

The root causes were independent, which is why fixing one did not fix the others:

| Cause | Where |
|---|---|
| Unprojected `populate()` on user references | `ReactorySupportService`, `StatisticsService`, `OrganizationService`, `SupportResolver`, `CommentResolver` |
| `context.user` (a full document) written into `createdBy` / `updatedBy` | `ReactorySupportService.createRequest`, `updateTicket` |
| Macros returning the raw Mongoose document as `data` | support, user, chats macros |
| Full documents persisted into `state.vars`, which is replayed every turn | `user` macros, `chats` macro |
| No redaction layer — the result processor bounded **size** only | `ToolResultProcessor` |
| Credential fields queryable over GraphQL | `type User`, `UserSession` |

## What the two pull requests change

**reactorynet/reactory-express-server#132** — the source, in `reactory-core`:

- every user-reference populate projects an explicit field set (`USER_REFERENCE_SELECT`);
- `createRequest` / `updateTicket` store `context.user._id`, not the document;
- `salt` and `password` removed from `type User`, so a GraphQL query selecting them fails
  validation;
- `sessionInfo` / `authentications` resolve to null unless the caller is the owner or an
  ADMIN/SUPPORT_ADMIN of the current partner;
- `UserSession.refresh` removed from the SDL;
- a `toJSON` transform on the User schema strips credential fields whenever a hydrated user is
  serialised, including when populated into another record.

**reactorynet/reactory-reactor#61** — the egress, in `reactory-reactor`:

- `ToolResultProcessor.redactSensitive()` deep-walks `data`, `metadata` and `params`, replacing
  credential-shaped values in place, and runs **before** the size measurement and the
  offload-to-file branch, so the artefact on disk is redacted too;
- `redactSensitiveText()` covers bare-string payloads at the same point;
- the `user` macros store projected views in `state.vars` rather than documents;
- support macros project through explicit allow-lists;
- `chats` persists and filters by user id;
- the `mongo` read macro excludes credential fields for user collections and for any `find`
  without an explicit projection;
- `web` strips `set-cookie`, `authorization` and `x-api-key` from response headers.

The two are deliberately independent: the reactor redaction pass does not depend on the core
projection, so neither blocks the other, and either alone reduces the exposure.

## What is NOT fixed by these pull requests

Read this before closing the incident.

**1. Rotation is outstanding.** The credentials already emitted are still valid. Refresh tokens
and provider OAuth access tokens must be revoked, and affected passwords reset. See the runbook.
A code fix does not un-leak what has already left the trust boundary.

**2. Already-persisted data is not scrubbed.** Conversations written before these fixes may still
contain full user documents in `vars` and in persisted tool history. This needs a targeted cleanup
migration, keyed by conversation id rather than by content regex — a regex over history would
re-materialise the secrets in the query output.

**3. `select: false` has not been applied to `User.password` / `User.salt`.** This is the change
that would stop the whole class by default, rather than relying on every call site projecting
correctly. It is deferred because it is not a drop-in: password verification reads the fields
through `findUserWithEmail`, and that same helper is used by local **and** every OAuth strategy, so
a `select: false` without an explicit `.select('+password +salt')` on the auth path breaks all
login. It should be the next follow-up, applied in a single commit with that select.

**4. Direct database read is only partially guarded.** The `mongo` macro excludes credential fields
for user collections by default, but a DEVELOPER/ADMIN caller can still construct an explicit
projection. Full protection requires the schema-level control in (3).

## Verification expectations

Both pull requests add behavioural regression tests rather than relying on review:

- assert `JSON.stringify(result)` for each support read matches neither `pbkdf2$`, `"salt":`,
  `"refresh":` nor `"accessToken":`;
- assert a payload carrying a user document is redacted **and** that the file written on offload
  contains no secret;
- assert `state.vars` holds no full user document;
- assert a GraphQL selection of `salt` / `password` fails validation.

Structural checks prove documents were edited. A behavioural check is what proves the system
honours it — an old JWT must be rejected with a session-revoked failure, not merely an expiry.

## Post-merge hygiene

`services/__tests__/ReactorySupportService.credentialLeak_plan.md` and the other `*_plan.md`
artefacts are working notes from the engineering runs. They are not documentation and should be
removed once the work settles.
