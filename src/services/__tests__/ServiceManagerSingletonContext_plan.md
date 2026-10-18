# Test Plan — ServiceManager singleton execution context

## Problem

`ServiceManager` memoises `lifeCycle: 'singleton'` instances on construction and
returns the cached object for later calls. The cached instance was constructed
once (normally during startup with the **system** context), and the caller's
context is only applied on the construction path. Any singleton that reads
`this.context.user` / `this.context.partner` at call time therefore acts as the
system user / `reactory` partner instead of the calling user / tenant.

See REACTORY-302016408/20261015/3703515660.

## Behaviour to lock down

1. A singleton constructed at startup (system context) must report the
   **caller's** context when resolved from a request.
2. Only one instance is constructed (singleton lifecycle preserved).
3. The shared instance's own `context` must not be mutated (Option B is racy).
4. The same caller keeps a stable reference (`getService` identity holds).
5. Different callers get isolated views of `this.context` while shared state
   (fields mutated through `this`) remains process-wide.
6. Interleaved async calls must not leak context across callers.
7. Singleton dependencies are rebound to the caller too.

## Test cases (`ServiceManagerSingletonContext.test.ts`)

- `resolves the caller context on a singleton constructed at startup`
  - start services with `systemContext`
  - resolve with `requestContextA`
  - expect `service.context === requestContextA`, `whoAmI() === 'user-a'`
  - expect exactly one construction and the cached instance still has the
    system context (no mutation).
- `returns a stable facade per caller while sharing singleton state`
  - same context → same object; different context → different object
  - `increment()` on one caller is visible on the other (shared state)
  - each caller reads its own identity.
- `keeps each caller's identity across awaits` — 20 interleaved calls across two
  contexts, assert each result belongs to its caller.
- `propagates the caller context to singleton dependencies` — consumer singleton
  holds a dependency resolved at startup; ask through the consumer and assert
  the dependency sees the request user.

## Why these fail before the fix

Before the fix the cache-hit branch returned the raw singleton, so
`service.context` was the system context and every `whoAmI()` returned the
system user id.
