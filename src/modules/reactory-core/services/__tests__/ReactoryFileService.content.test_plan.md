# `ReactoryFileService.content.test.ts` — TDD Plan

**Target:** `src/modules/reactory-core/services/ReactoryFileService.ts`
**Methods under test:** `readFileContent`, `writeFileContent`
**Related spec:** `reactory-pwa-client/src/components/shared/File/SPEC.md` §10.3

## Fixture strategy

- Use `mock-fs` (already in devDependencies) to build a virtual `APP_DATA_ROOT` tree
  containing:
  - `files/hello.txt` — small plain-text file
  - `files/config.json` — small JSON file
  - `files/empty.bin` — empty file
  - `files/large.bin` — synthesized >2 MB buffer
- Rebuild the mock FS in `beforeEach`; `mock.restore()` in `afterEach`.
- Override `process.env.APP_DATA_ROOT` to a stable path (`/virtual/app-data`) inside
  the mock tree; restore after each test.

## Mock context

Minimal `Reactory.Server.IReactoryContext` shape sufficient for the service:

```ts
{
  user: { _id: new ObjectId() },
  partner: { _id: new ObjectId(), key: 'reactory' },
  hasRole: jest.fn((role: string) => roles.includes(role)),
  log/info/warn/error/debug: jest.fn(),
}
```

Two contexts per test file:
- `adminCtx` — `hasRole('ADMIN')` → true.
- `anonCtx`  — `hasRole(*)`        → false.

## Test cases

### `readFileContent`

1. **returns content + sha256 revision for a text file**
   - Pre: `files/hello.txt` contains `"hello world"`.
   - Call: `service.readFileContent('files/hello.txt')`.
   - Assert: `content === 'hello world'`, `revision` matches
     `crypto.createHash('sha256').update('hello world').digest('hex').slice(0, 16)`,
     `mimetype === 'text/plain'`, `bytes === 11`, `modified` is a Date.

2. **returns `application/json` mimetype for `.json`**
   - Pre: `files/config.json` contains `'{"a":1}'`.
   - Assert: `mimetype === 'application/json'`.

3. **handles template variables in path (`${APP_DATA_ROOT}/…`)**
   - Call: `service.readFileContent('${APP_DATA_ROOT}/files/hello.txt')`.
   - Assert: resolves equivalently.

4. **throws `FILE_NOT_FOUND` when path does not exist**
   - Call: `service.readFileContent('files/missing.txt')`.
   - Assert: throws `ApiError`, `err.meta.code === 'FILE_NOT_FOUND'`.

5. **throws `ACCESS_DENIED` for non-admin/non-developer contexts**
   - Use `anonCtx`.
   - Assert: throws, `err.meta.code === 'ACCESS_DENIED'`.

6. **empty file returns empty string with stable revision**
   - Pre: `files/empty.bin` (0 bytes).
   - Assert: `content === ''`, `bytes === 0`, `revision` is the sha256-hex of `''`.

### `writeFileContent`

7. **writes content and returns new revision**
   - Call: `service.writeFileContent('files/hello.txt', 'updated')`.
   - Assert: on-disk content is `'updated'`, return `{ revision, savedAt, bytesWritten: 7 }`.

8. **creates file when target does not exist**
   - Call: `service.writeFileContent('files/new.txt', 'hi')`.
   - Assert: file exists, content `'hi'`, `bytesWritten === 2`.

9. **with matching `baseRevision` succeeds**
   - Pre: read `files/hello.txt` → get `revision` (= `rev0`).
   - Call: `service.writeFileContent('files/hello.txt', 'next', rev0)`.
   - Assert: returns success.

10. **with stale `baseRevision` throws `STALE_REVISION`**
    - Pre: rev0 = read; overwrite on disk to new content (producing rev1).
    - Call: `service.writeFileContent('files/hello.txt', 'clobber', rev0)`.
    - Assert: throws, `err.meta.code === 'STALE_REVISION'`,
      `err.meta.currentRevision === rev1`.

11. **with stale `baseRevision` and `force: true` succeeds**
    - Assert: overwrites, returns success.

12. **rejects content >2 MB with `FILE_TOO_LARGE`**
    - Call with 2 MB + 1 byte string.
    - Assert: throws, `err.meta.code === 'FILE_TOO_LARGE'`,
      `err.meta.maxBytes === 2 * 1024 * 1024`.

13. **rejects path traversal (`../` escape) with `INVALID_PATH`**
    - Call: `service.writeFileContent('../etc/passwd', 'x')`.
    - Assert: throws, `err.meta.code === 'INVALID_PATH'`.

14. **rejects write for non-admin/non-developer with `ACCESS_DENIED`**
    - Use `anonCtx`.
    - Assert: throws, `err.meta.code === 'ACCESS_DENIED'`.

15. **writes atomically — no partial file left on validation failure**
    - Call with oversized content targeting an existing file.
    - Assert: original file content unchanged after the throw.

## What is intentionally NOT tested here

- Concurrency / file-locking semantics — OS-level, out of scope for unit tests. Covered
  by the `FileSSETransportManager` integration test in Phase 2.
- Encoding conversion — the spec locks to `utf-8` for v1.
- Directory creation for deeply nested new files — deferred; caller must ensure parent
  exists until we add recursive mkdir.
