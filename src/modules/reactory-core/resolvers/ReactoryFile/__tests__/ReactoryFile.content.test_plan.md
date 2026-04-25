# `ReactoryFile.content.test.ts` — TDD Plan

**Target:** `src/modules/reactory-core/resolvers/ReactoryFile/ReactoryFile.ts`
**Methods under test:** `readFile`, `writeFile`, `openFileSession`, `closeFileSession`
**Related plan:** `reactory-pwa-client/src/components/shared/File/PLAN.md` §Phase 3

## Shape

Unit tests that call each resolver method directly (no Apollo harness required —
the `@query/@mutation` decorators are registration-only, the method is still a
plain async function). Services are injected via a fake `getService` on the
context.

## Fakes

- `fakeFileService` — stubs `readFileContent` + `writeFileContent`.
- `fakeTransportManager` — stubs `openSession`, `closeSession`, `noteLocalWrite`,
  `sessionIdFor`.
- `context.getService(id)` returns whichever fake matches the service id.
- `context.hasRole(role)` returns true for ADMIN (configurable per test).
- `context.user`, `context.partner` are minimal ObjectId + key stubs.

## Test cases

### `ReactoryReadFile`

1. **Happy path → `ReactoryFileContent`**
   - Fake service returns `{ content: 'x', revision: 'r1', mimetype: 'text/plain', bytes: 1, modified: new Date('2026-04-18T00:00:00Z') }`.
   - Assert resolver returns `__typename: 'ReactoryFileContent'`, `modified` is
     the ISO string.

2. **Service throws `ApiError(FILE_NOT_FOUND)` → `ReactoryFileError` with same code**

3. **Service throws `ApiError(ACCESS_DENIED)` → `ReactoryFileError`**

4. **Unknown error → `ReactoryFileError` with `code: 'INTERNAL'`**

### `ReactoryWriteFile`

5. **Happy path → `ReactoryFileWriteSuccess` + `noteLocalWrite` called first**
   - Call order assertion: `noteLocalWrite` invoked *before* `writeFileContent`
     (spy order).
   - `noteLocalWrite` receives the expected sessionId (from `sessionIdFor`) and
     revision (sha256 hex-16 of the content).

6. **`STALE_REVISION` from service → `ReactoryFileError` with `currentRevision`**
   - Fake throws `ApiError('…', { code: 'STALE_REVISION', currentRevision: 'r9' })`.
   - Resolver surfaces both `code` and `currentRevision` on the error.

7. **`FILE_TOO_LARGE` from service → `ReactoryFileError` with `maxBytes`**

8. **`sessionIdFor` throwing does NOT abort the write**
   - Fake throws from `sessionIdFor`; the write still proceeds + returns success.
   - Rationale: echo-suppression is best-effort.

### `ReactoryOpenFileSession`

9. **Non-admin context → `ReactoryFileError(ACCESS_DENIED)`**
   - `hasRole` returns false for everything; manager NOT called.

10. **Admin happy path → `ReactoryFileSession`**
    - Fake manager returns `{ sessionId, endpoint, token, expiry, currentRevision }`.
    - Assert ISO string for `expiry` and passthrough of the other fields.

11. **Manager throws `ApiError(FILE_NOT_FOUND)` → `ReactoryFileError`**

### `ReactoryCloseFileSession`

12. **Happy path → `ReactoryFileSessionCloseSuccess`**
    - `closeSession` called with the passed sessionId.

13. **Manager throws → `ReactoryFileError`**
