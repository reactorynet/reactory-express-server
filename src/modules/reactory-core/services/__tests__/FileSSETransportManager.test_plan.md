# `FileSSETransportManager.test.ts` — TDD Plan

**Target:** `src/modules/reactory-core/services/FileSSETransportManager.ts` (new)
**Related spec:** `reactory-pwa-client/src/components/shared/File/SPEC.md` §10
**Related plan:** `reactory-pwa-client/src/components/shared/File/PLAN.md` §Phase 2

## Scope

Unit tests that verify the manager's session, subscriber, and watcher lifecycle —
without needing a real chokidar watcher, real Express server, or Redis. Chokidar is
mocked at module boundary; Express `Response` is a fake writable. Token storage is
in-memory (no Redis dependency in v1).

## Mocks

### `chokidar` (module mock)

`jest.mock('chokidar')` returns `{ watch: jest.fn() }`. Per test, each `watch(path)`
call returns a fresh `MockWatcher` — an `EventEmitter` with an added `.close()`
method. Tests call `watcher.emit('change', path)` to simulate filesystem events.

### Express `Response`

Minimal fake with `setHeader`, `flushHeaders`, `write`, `end`, `on`, plus a `_writes`
array used by tests to assert what was sent down the wire. Emits `close` when
tests call `res._emitClose()`.

### Context

Same shape as the Phase 1 tests — `user`, `partner`, `hasRole`, logging stubs.

## Test cases

### Session identity

1. **`openSession` returns deterministic sessionId for same (partner, path)**
   - Two calls with identical input → same `sessionId`.
   - sessionId is 16-char hex.

2. **Different paths produce different sessionIds**

3. **Different partner keys produce different sessionIds** (tenant isolation)

4. **`openSession` returns current file revision**
   - Temp file contains `'hello'`.
   - Assert `currentRevision === sha256(hello).slice(0,16)`.

### Session + subscriber lifecycle

5. **Opening a session creates exactly one chokidar watcher**
   - Assert `chokidar.watch` called once.

6. **Opening the same session twice reuses the watcher**
   - Two `openSession` calls → `chokidar.watch` called once total.

7. **`attachTransport` with valid token writes `opened` SSE event**
   - Response received `event: opened\ndata: {...}\n\n` containing current revision.

8. **`attachTransport` with wrong token throws UNAUTHORIZED**

9. **`attachTransport` with expired token throws TOKEN_EXPIRED**
   - Manipulate session expiry to past.

10. **Two subscribers on same session share a single watcher and both receive events**
    - Open once, attach twice, emit one `change` → both responses see `file_changed`.

### Broadcast + echo suppression

11. **Watcher `change` event broadcasts `file_changed` to subscribers**
    - Event payload includes new `revision`, `summary.bytesAfter`, `timestamp`.

12. **`noteLocalWrite(sessionId, revision)` suppresses matching broadcast**
    - Call `noteLocalWrite`, then emit `change` whose resulting file has that revision.
    - No `file_changed` event is written to subscribers.

13. **Echo-suppression note expires after 2 s**
    - Use jest fake timers; advance by 2001 ms; emit `change` with same revision.
    - Event IS broadcast.

14. **`unlink` event broadcasts `file_deleted`**

### Eviction

15. **Last subscriber disconnect starts 60 s eviction timer**
    - Use jest fake timers; advance 59 s → watcher still open.
    - Advance 2 more s → watcher.close called, session dropped.

16. **Re-attach within eviction window cancels the timer**
    - Attach A, close A, within 30 s attach B.
    - After 60 s total: watcher still open, session still present.

17. **`closeSession(sessionId)` closes all subscribers and watcher immediately**

### Heartbeat

18. **Subscriber heartbeat timer fires every 15 s**
    - Use fake timers; advance 15 s; assert SSE comment `: heartbeat\n\n` written.

## Out of scope for this test file

- The HTTP route layer (`/reactory/files/sse/:sessionId`) — covered in a separate
  endpoint test next to the route file.
- Real chokidar behaviour on macOS/Linux — covered only by manual smoke + the
  Phase-2 integration test described in SPEC §13.
- Redis persistence — deferred; v1 uses in-memory token store (SSE requires
  sticky process affinity anyway).
