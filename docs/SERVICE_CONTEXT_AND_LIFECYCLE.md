# Service Lifecycle and Execution Context

Reference: `REACTORY-302016408/20261015/3703515660` — *Multi-tenant: singleton
services are bound to the startup system context (identity attribution defect)*.

## The contract

A service declaration's `lifeCycle` controls **instance sharing**, never
**identity**:

| `lifeCycle`  | Instances                              | `this.context` on a call |
| ------------ | -------------------------------------- | ------------------------ |
| `singleton`  | one per process, shared by all callers  | the **caller's** context |
| `request`    | one per `context.state`                | the caller's context     |
| `instance`   | one per `getService(...)` call          | the caller's context     |

Before this change `singleton` instances cached at (or after) startup kept the
context they were constructed with — normally the **system** context — and every
later caller received that object unchanged. Any singleton that read
`this.context.user` / `this.context.partner` at call time therefore wrote audit
fields (`createdBy`, `updatedBy`, `owner`, `actorId`) as the system user and
queried as the `reactory` partner.

## How it is implemented

`ServiceManager.getService` returns singletons through
`getContextBoundInstance()` (`src/services/serviceExecutionContext.ts`):

- The shared instance stays a single object; process-wide state (connections,
  caches, counters, listeners) is untouched.
- Each caller receives a facade (a `Proxy`) whose `context` property resolves to
  the caller's context and whose methods run with the facade as `this`. Reads of
  `this.context` therefore see the caller even after an `await`.
- Facades are cached per `(instance, context)` pair, so repeated resolutions
  from the same context stay referentially identical (existing singleton
  semantics), while different callers never share a façade.
- Singleton *dependencies* held on a service are rebased onto the calling
  context when read through a facade, so identity survives more than one hop
  (e.g. `OrganizationService` → `KYCDocumentService`).
- `this.context = …` / `setExecutionContext(...)` writes are scoped to the
  caller's facade; they never mutate the shared instance.

The ticket's Option B (assigning `instance.context = context` on the cache hit)
was rejected: a singleton is shared between interleaved requests, so a call that
reads `this.context` after an `await` could observe another request's context.
Facades carry no shared mutable state and are therefore race-free.

The unused `ServiceManager.context` field (assigned in the constructor, never
read) was removed.

## Writing a service

- Prefer passing the actor/tenant explicitly on identity-sensitive methods
  (`createTeam(orgId, name, executionContext?)`, `params.userId`, …). The caller
  already holds the request context, and the intent is then visible in the
  signature.
- Reading `this.context` at call time is still correct for singletons resolved
  through `ServiceManager`; it is what the facade binds.
- Do **not** cache `this.context` in a field at construction time
  (`this.someContext = this.context`) and read that later — that captures the
  construction context and reintroduces the defect. Read `this.context` at the
  point of use.
- Never assume `this.context` is the system context. Services that need the
  system identity at boot should use the context passed to `onStartup(context)`
  rather than a field captured in the constructor.

## Tier 2 triage (services that hold `this.context` but read no tenant identity)

These keep `lifeCycle: 'singleton'` and are **intentionally context-agnostic**;
the facade makes them safe either way:

- *System-bound at boot*: `RedisService`, `RateLimiterService`,
  `ReactoryModelRegistryService`, `FileSSETransportManager`,
  `ModuleGenerator`, `GoogleAuthService`, `GoogleAuditService`,
  `CommunicatorQueueService`, `ProviderRegistry`, `WebhookService`,
  `StreamingTransportManager`, `ShellSessionManager`, `ReactorPlaywrightService`,
  `StreamingSessionManager`, `persona-loader` — they use the context for
  logging/telemetry/config only, and their lifecycle work happens in
  `onStartup(context)`.
- *Collaborator pass-through*: `MessageService`, `ReportingService`,
  `TemporalService`(s), payment/product services, `ReactorMacroService`,
  `speech` service — they forward `this.context` to collaborators, which now
  receive the caller's context (an improvement, not a regression).

Tier 1 services (`OrganizationService`, the KYC services and the Google
per-user services) either take the actor explicitly or read `this.context` at
call time; both are correct under this contract.
