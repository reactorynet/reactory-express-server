---
title: reactory-queue
status: Partial
owner: platform
verified: 2026-10-19
verifiedAgainst: reactory-express-server@59639fe / reactory-queue@349ce0a
audience: developer
---

# reactory-queue

`reactory.Queue@1.0.0` is the transport abstraction that asynchronous modules resolve
before they can put a message on a queue. It defines one small interface, registers
three implementations behind a provider registry, and stops there.

> **Read this first.** This module is a *queue client abstraction*, not a job
> scheduler, worker runtime or workflow engine. Retry policy, dead-letter queues,
> consumers, tenant partitioning and telemetry are **not** implemented here. The
> modules that use `reactory-queue` implement them, each in its own way (§8).
> The module's own `AGENT.md` claims a GraphQL API, gRPC endpoints and
> OpenTelemetry instrumentation; none of those are contributed (§9).

The page is written for a developer who has to pick and configure a backend. §5 is
the decision surface; §8 is the operations surface; §9 is the list of things that
will surprise you.

---

## 1. Purpose and status

### What it does

- Provides one service contract — enqueue, dequeue, delete, receive, count, create
  queue, delete queue — over three backends
  (`src/modules/reactory-queue/services/queue/types.ts:53`).
- Provides a registry that resolves a backend by key and exposes a configured
  default (`src/modules/reactory-queue/services/queue/QueueProvider.ts:192`).
- Shields callers from the backend's own SDK (BullMQ, `@aws-sdk/client-sqs`) and
  from the queue's address (name, URL, in-process map).

### What it explicitly does not do

- **No scheduler.** There is no cron, no delayed-job API of its own, and no
  scheduler service. BullMQ `delay` reaches the backend only because job options
  are forwarded (`BullMessageQueueService.ts:102`).
- **No worker runtime.** No provider starts a consumer. The only worker in the
  module is the BullMQ startup health check (`BullMessageQueueService.ts:154`).
- **No retry policy, backoff or dead-letter queue.** `failureQueueId` is accepted
  and discarded (`types.ts:13`, `BullMessageQueueService.ts:97`).
- **No GraphQL API, forms, routes, views or workflow steps.** Those extension
  points are empty literals (§2, §4, §6, §7).
- **No tenant dimension.** Queue ids are global strings (§8.6).

### Status

**Partial.** The abstraction and all three adapters exist and are wired into the
service registry, but two adapters have non-functional or stubbed methods, and the
configuration surface does not behave as its own README describes.

| Capability | Status | Evidence |
|---|---|---|
| Loaded by default | Implemented — present in `available`, `enabled` and `installed` | `src/modules/available.json:43`, `src/modules/enabled-reactory.json:43`, `src/modules/installed.json:43` |
| Provider registry (`QueueProvider`) | Implemented | `services/queue/QueueProvider.ts:34` |
| In-memory adapter | Implemented, single process and single provider instance only | `services/queue/InMemoryQueueService.ts:37` |
| BullMQ adapter | Partial — enqueue/peek/delete work; `dequeue()` cannot find its jobs | `services/queue/BullMessageQueueService.ts:106` |
| AWS SQS adapter | Partial — send/receive/delete work; `count`, `createQueue`, `deleteQueue` are stubs | `services/queue/AWSSQSService.ts:265` |
| GraphQL API | Not implemented | `graph/index.ts:1` |
| Forms / routes / client plugin | Not implemented | `forms/index.ts:1`, `routes/index.ts:1`, `reactory-queue/index.ts:25` |
| Workflow steps or YAML flows | Not implemented | `workflow/index.ts:1` |
| Retry / backoff / DLQ | Not implemented | `types.ts:13`, `BullMessageQueueService.ts:97` |
| Telemetry | Not implemented — `bullmq-otel` is a declared dependency, never imported | `package.json:12` |
| Registry/licence agreement | Contradictory — see §9.12 | `available.json:48`, `package.json:8`, `LICENSE:1` |

### Where it sits

```mermaid
flowchart TD
    A[Caller: product, payment, communicator, KYC, workflow listener] --> B[reactory.QueueProvider@1.0.0]
    B --> C{Provider registry}
    C --> D[BullMessageQueueService]
    C --> E[InMemoryQueueService]
    C --> F[AWSSQSQueueService]
    D --> G[(Redis)]
    E --> H[(Process memory)]
    F --> I[(AWS SQS)]
```

---

## 2. Module contract

Defined in `src/modules/reactory-queue/index.ts:11`. The FQN is derived from
`nameSpace` + `name` + `version` (`src/application/decorators/service.ts:14`).

| Field | Value | Evidence |
|---|---|---|
| `id` | `reactory-queue` | `reactory-queue/index.ts:12` |
| `nameSpace` | `reactory` | `reactory-queue/index.ts:13` |
| `name` | `Queue` | `reactory-queue/index.ts:14` |
| `version` | `1.0.0` | `reactory-queue/index.ts:15` |
| **FQN** | **`reactory.Queue@1.0.0`** | `reactory-queue/index.ts:13-15`, `available.json:46` |
| `dependencies` | `core.ReactoryServer@1.0.0` | `reactory-queue/index.ts:17` |
| `priority` | `2` | `reactory-queue/index.ts:18` |
| `moduleEntry` | `reactory-queue/index.ts` | `available.json:47` |

### Extension points contributed

The module declares twelve extension points. Four are empty literals; the only
non-empty contribution is the service list.

| Extension point | Value | Effect |
|---|---|---|
| `services` | 4 services | The module's entire public surface — see §5 |
| `graphDefinitions` | `{}` | No types, queries, mutations or subscriptions (§4) |
| `workflows` | `[]` | No step types or YAML flows (§7) |
| `forms` | `[]` | No forms (§6) |
| `models` | `[]` | No persistence models (§3) |
| `translations` | `[]` | No translations |
| `clientPlugins` | `[]` | No client plugin (§6) |
| `pdfs` | `[]` | None |
| `passportProviders` | `[]` | None |
| `grpc` | `[]` | No gRPC surface, despite `AGENT.md:5` |
| `routes` | `{}` | No Express routes (§6) |
| `cli` | `[]` | No CLI commands |

Evidence: `reactory-queue/index.ts:19-28`; the empty literals are at
`graph/index.ts:1`, `workflow/index.ts:1`, `forms/index.ts:1`, `models/index.ts:1`,
`i18n/index.ts:1`, `routes/index.ts:1`, `cli/index.ts:1`, `protobuf/index.ts:1`.

### Registry state

`reactory-queue` appears in all three registry files, so it is available, enabled
and installed on a default deployment — which is what "loaded by default" means
here. The three files agree on the entry (`available.json:42-51`,
`enabled-reactory.json:42-51`, `installed.json:42-51`), but not on the licence
(§9.12).

---

## 3. Data model

### There are no models

`models/index.ts:1` exports an empty array. The module defines no Mongoose or
TypeORM entity, no collection or table, no index and no migration. Nothing about a
queue is persisted in the Reactory database.

### The envelope

Every provider moves the same envelope (`types.ts:5`, `types.ts:97`,
`types.ts:112`, `types.ts:119`):

```ts
interface IQueueEnvelope<THeader, TBody> {
  header: THeader;   // EnvelopeHeader: id, receivedTimestamp, provider
  body: TBody;       // EventEnvelopeBody: validationResults?: string[]
}
```

Consumers extend the header with their own fields — `eventType`, `timestamp`,
`correlationId`, `source` — for example
`src/modules/reactory-product/events/index.ts:391`. The abstraction never validates
the envelope; it is a pass-through (`InMemoryQueueService.ts:48`,
`AWSSQSService.ts:196`).

### Where a job actually lives

| Provider | Backing store | Names / addressing | Lifetime | Evidence |
|---|---|---|---|---|
| `bullmq` | Redis, via BullMQ | Two queues created at construction: `DEFAULT_QUEUE_NAME` (default `defaultQueue`) and `HEALTH_CHECK_QUEUE_NAME` (default `healthCheckQueue`). One mutable `queue` slot; `createQueue(id)` replaces it. | Redis persistence, subject to Redis eviction policy | `BullMessageQueueService.ts:13-14`, `:53`, `:61`, `:136` |
| `in-memory` | `Map<string, EventEnvelope[]>` in the process | `defaultQueue` and `healthCheckQueue` pre-created; any other id must be created | Lost on restart; lost when the provider instance is replaced | `InMemoryQueueService.ts:38`, `:41-43` |
| `aws-sqs` | Amazon SQS | One base `queueUrl` per instance, plus a `Map<queueId, queueUrl>` resolution cache | Queue-side retention and visibility timeout | `AWSSQSService.ts:92`, `:76`, `:141` |

### Identifier semantics (they are not interchangeable)

| Provider | `enqueue` returns | Usable as `deleteMessage(id)`? |
|---|---|---|
| `bullmq` | BullMQ `job.id` | Yes — `deleteMessage` looks the job up by id (`BullMessageQueueService.ts:116`) |
| `in-memory` | `` `${queueId}-${index}` `` (`InMemoryQueueService.ts:64`) | Yes, but index-based: deleting shifts the array, so a stale id can delete the wrong message (`InMemoryQueueService.ts:76-80`) |
| `aws-sqs` | SQS `MessageId` | **No.** `deleteMessage` expects a receipt handle. `receiveMessages` rewrites `header.id` to the receipt handle (`AWSSQSService.ts:260`), which is the only id that works |

---

## 4. GraphQL API

**There is none.** `graph/index.ts:1` exports an empty object literal:

```ts
export default {} as Reactory.Graph.IGraphDefinitions;
```

Consequences:

- No SDL types, queries, mutations or subscriptions are contributed, so this
  module has no `@auth` directives either.
- Queue depth, message inspection, retry and drain cannot be driven from the
  client or from GraphQL tooling.
- The provider registry is reachable only as a service
  (`context.getService('reactory.QueueProvider@1.0.0')`), not as a GraphQL field.

If you need to inspect a queue, use the backend's own tooling:

| Task | BullMQ | In-memory | AWS SQS |
|---|---|---|---|
| Inspect depth | `queue.count()` via the service, or Redis / Bull Board | `count(queueId)` on the in-process map only | SQS console metrics; the module's `count()` returns `-1` |
| Inspect messages | `receiveMessages()` (peek) | `receiveMessages()` (peek) | `receiveMessages()` (long poll, does not delete) |
| Remove a message | `deleteMessage(jobId)` | `deleteMessage(queueId-index)` | `deleteMessage(receiptHandle)` |
| Drain a queue | `deleteQueue()` — drains and closes | `deleteQueue(queueId)` | Not implemented (stub) |

Evidence: `BullMessageQueueService.ts:127-143`,
`InMemoryQueueService.ts:88-110`, `AWSSQSService.ts:249-278`.

---

## 5. Services

Four services are registered, all `serviceType: 'data'`
(`services/index.ts:6-11`).

| Service FQN | Roles | Lifecycle | Declared dependencies | Backend key |
|---|---|---|---|---|
| `reactory.QueueProvider@1.0.0` | `SYSTEM` | `instance` (default) | none | — |
| `reactory.BullMessageQueueService@1.0.0` | `USER` | `instance` (default) | none | `bullmq` |
| `reactory.InMemoryQueueService@1.0.0` | `USER` | `instance` (default) | none | `in-memory` |
| `reactory.AWSSQSQueueService@1.0.0` | `USER` | `instance` (default) | none | `aws-sqs` |

Evidence: `QueueProvider.ts:34-41`, `BullMessageQueueService.ts:24-31`,
`InMemoryQueueService.ts:17-24`, `AWSSQSService.ts:50-57`. Lifecycle is the
decorator default `instance` (`src/application/decorators/service.ts:36`) because
no service in this module declares `lifeCycle`.

> **The lifecycle matters more than anything else on this page.** An `instance`
> service is constructed afresh on every `getService()` call
> (`src/services/ServiceManager.ts:120`, `:203`). Every consumer therefore gets its
> **own** `QueueProvider`, its own registry and its own adapter instances. See §9.2
> for what that breaks.

### 5.1 `QueueProvider` — the registry

`QueueProvider` builds one adapter per enabled key at construction and exposes it
by key (`QueueProvider.ts:120-165`).

| Method | Behaviour | Evidence |
|---|---|---|
| `getProvider(key?)` | Returns the adapter for `key`, or the default when omitted; logs a warning and returns `undefined` when missing | `QueueProvider.ts:192` |
| `getDefaultProvider()` | `getProvider(defaultProviderKey)` | `QueueProvider.ts:210` |
| `setDefaultProvider(key)` | Sets the default on **this instance**; throws when the key is not registered | `QueueProvider.ts:218` |
| `getAvailableProviders()` | Array of registered keys | `QueueProvider.ts:231` |
| `hasProvider(key)` | Boolean | `QueueProvider.ts:239` |
| `getAllProviders()` | Shallow copy of the registry map | `QueueProvider.ts:247` |
| `registerProvider(key, adapter)` | Adds or overwrites; warns on overwrite | `QueueProvider.ts:172` |
| `unregisterProvider(key)` | Removes; returns whether anything was removed | `QueueProvider.ts:183` |
| `onStartup()` | Calls each adapter's `onStartup` and logs the registry contents | `QueueProvider.ts:254` |

**Which adapters get registered**

| Key | Registered when | Evidence |
|---|---|---|
| `bullmq` | `REACTORY_QUEUE_BULLMQ_ENABLED === 'true'` | `QueueProvider.ts:79`, `:125` |
| `in-memory` | Always, unless `providers['in-memory'].enabled === false` in props | `QueueProvider.ts:139` |
| `aws-sqs` | `REACTORY_QUEUE_AWS_SQS_ENABLED === 'true'` | `QueueProvider.ts:93`, `:153` |

A failure while constructing an adapter is logged and swallowed
(`QueueProvider.ts:133`, `:147`, `:161`), so a misconfigured backend degrades to a
missing provider rather than a failed boot.

### 5.2 Choosing a provider

| If you need… | Choose | Because |
|---|---|---|
| Unit tests, local development, a zero-dependency default | `in-memory` | No external service; but it only works inside a single resolved provider instance (§9.2) |
| Durable jobs in a Redis deployment, BullMQ job options (`delay`, `attempts`, `backoff`, `priority`) | `bullmq` | The only adapter that forwards job options (`BullMessageQueueService.ts:85-104`) |
| AWS-native deployment, managed durability, queue-side redrive and visibility timeout | `aws-sqs` | The only adapter whose ack actually works after a peek (`AWSSQSService.ts:260`) |
| Cross-process delivery on the default configuration | `aws-sqs`, or `bullmq` with an explicitly selected queue | `in-memory` cannot cross processes and `bullmq` cannot be re-targeted per enqueue |
| A consumer that reads with `dequeue()` | `aws-sqs` or `in-memory` | `bullmq`'s `dequeue()` looks up a fixed job id and returns nothing (§9.3) |

Do **not** treat the three as interchangeable at the method level. They share a
TypeScript interface, not behaviour.

### 5.3 Provider capability matrix

`●` implemented · `◐` partial or surprising · `○` not implemented

| Capability | `bullmq` | `in-memory` | `aws-sqs` |
|---|---|---|---|
| `enqueue(message, opts)` | `●` adds a job named `enqueueJob` to the current slot; forwards BullMQ job options | `●` appends to `queueId`; requires `createIfNotExists` for an unknown queue | `●` resolves the queue URL, then `SendMessage` |
| `queueId` on `enqueue` | `○` ignored — call `createQueue(id)` first | `●` honoured | `●` honoured (URL or name) |
| `createIfNotExists` | `◐` accepted and unnecessary; BullMQ creates on first add | `●` honoured; without it an unknown queue throws | `●` honoured; creates only for a genuine "does not exist" error |
| `dequeue()` | `○` `getJob('enqueueJob')` looks up by **id**, so it normally finds nothing and throws | `●` shifts the head of the named queue | `◐` receives one message but **does not delete** it |
| `receiveMessages()` | `◐` peeks `active` + `waiting`; `queueId` ignored | `●` peeks; throws for an unknown queue | `●` peeks, long-polls 10 s, rewrites `header.id` to the receipt handle |
| `deleteMessage(id)` | `◐` works by job id; `queueId` ignored | `◐` works by `${queueId}-${index}`; index-based | `◐` works by receipt handle, but always on `this.queueUrl` |
| `count(queueId)` | `◐` current queue only; `queueId` ignored | `●` length; `0` for an unknown queue | `○` returns `-1` |
| `createQueue(id)` | `◐` replaces the current slot | `●` creates; `false` when it already exists | `○` returns `true`, creates nothing |
| `deleteQueue(id)` | `◐` `drain()` + `close()`; does not delete Redis keys | `●` deletes the map entry | `○` returns `true`, deletes nothing |
| Retry / backoff | `◐` only if the caller passes `attempts` / `backoff` | `○` | `○` (queue-side redrive only) |
| Receipt-safe ack after peek | `○` | `○` | `●` |

Evidence: `BullMessageQueueService.ts:85-167`, `InMemoryQueueService.ts:48-137`,
`AWSSQSService.ts:141-320`.

### 5.4 Configuration

**Environment variables**

| Variable | Used by | Effect | Evidence |
|---|---|---|---|
| `REACTORY_QUEUE_PROVIDER` | `QueueProvider` | Intended default-provider selection — **shadowed, see §9.1** | `QueueProvider.ts:65` |
| `REACTORY_QUEUE_BULLMQ_ENABLED` | `QueueProvider` | Registers the BullMQ adapter when exactly `'true'` | `QueueProvider.ts:79` |
| `REACTORY_REDIS_HOST` | `QueueProvider`, `BullMessageQueueService` | Redis host (default `localhost`) | `QueueProvider.ts:82`, `BullMessageQueueService.ts:55` |
| `REACTORY_REDIS_PORT` | both | Redis port (default `6379`) | `QueueProvider.ts:83` |
| `REACTORY_REDIS_PASSWORD` | both | Redis password (default `reactory`) | `QueueProvider.ts:84` |
| `REACTORY_QUEUE_AWS_SQS_ENABLED` | `QueueProvider` | Registers the SQS adapter when exactly `'true'` | `QueueProvider.ts:93` |
| `AWS_REGION` | both | SQS region (default `us-east-1`) | `QueueProvider.ts:95`, `AWSSQSService.ts:87` |
| `DEFAULT_SQS_QUEUE_URL` | both | Base SQS queue URL. Placeholder default is `https://sqs.default-region.amazonaws.com/123456789012/defaultQueue` | `QueueProvider.ts:96`, `AWSSQSService.ts:31` |
| `HEALTH_CHECK_SQS_QUEUE_URL` | `AWSSQSQueueService` | Health-check queue URL; also counts as "SQS is configured" | `AWSSQSService.ts:32`, `:290` |
| `SQS_QUEUE_CREATION_PROPAGATION_MS` | `AWSSQSQueueService` | Delay before retrying a send after `CreateQueue` (default `1000`) | `AWSSQSService.ts:38`, `:96` |
| `DEFAULT_QUEUE_NAME` | `BullMessageQueueService`, `InMemoryQueueService` | Default queue name (default `defaultQueue`) | `BullMessageQueueService.ts:13`, `InMemoryQueueService.ts:12` |
| `HEALTH_CHECK_QUEUE_NAME` | both | Health-check queue name (default `healthCheckQueue`) | `BullMessageQueueService.ts:14`, `InMemoryQueueService.ts:13` |

Copy-paste configuration for each backend (defaults shown where the variable is
optional):

```bash
# In-memory — the built-in default. Nothing to set.
# It is registered unless props disable it, and it never leaves the process.

# Redis / BullMQ
REACTORY_QUEUE_BULLMQ_ENABLED=true
REACTORY_REDIS_HOST=redis.internal
REACTORY_REDIS_PORT=6379
REACTORY_REDIS_PASSWORD=change-me
DEFAULT_QUEUE_NAME=defaultQueue          # optional
HEALTH_CHECK_QUEUE_NAME=healthCheckQueue # optional

# AWS SQS — credentials come from the SDK chain (env, profile, instance role)
REACTORY_QUEUE_AWS_SQS_ENABLED=true
AWS_REGION=eu-west-1
DEFAULT_SQS_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/123456789012/defaultQueue
HEALTH_CHECK_SQS_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/123456789012/healthCheckQueue
SQS_QUEUE_CREATION_PROPAGATION_MS=1000  # optional
```

Enabling an adapter registers it. It does **not** make it the default — use
`queueConfig.defaultProvider` or `setDefaultProvider` for that (§9.1).

The queue-name variables are read at **module import time**
(`BullMessageQueueService.ts:12-15`, `InMemoryQueueService.ts:11-14`), not at
service construction. They must be set before the module is imported.

**Programmatic configuration**

```ts
const queueProvider = new QueueProvider(
  {
    queueConfig: {
      defaultProvider: 'bullmq',
      providers: {
        'bullmq': { enabled: true, config: { redis: { host: 'redis', port: 6379 } } },
        'in-memory': { enabled: false, config: {} },
      },
    },
  },
  context,
);
```

Shape: `IQueueProviderConfig` (`QueueProvider.ts:8`); merge semantics:
`QueueProvider.ts:103-116`.

Two caveats, both material:

1. **`defaultProvider` from props is the only way to change the default before
   first use** (§9.1).
2. **`providers.bullmq.config.redis` is passed to the adapter and then ignored** —
   `BullMessageQueueService` reads `process.env` directly and never looks at
   `props` (`BullMessageQueueService.ts:51-68`, compared with `QueueProvider.ts:127-130`).
   Only environment variables change the Redis connection. The SQS adapter, by
   contrast, honours `props.region`, `props.credentials`, `props.queueUrl`,
   `props.healthCheckQueueUrl` and `props.createQueuePropagationMs`
   (`AWSSQSService.ts:86-96`).

**Working example (the pattern used in-tree)**

```ts
const registry = context.getService<QueueProvider>('reactory.QueueProvider@1.0.0');
const queue = registry.getProvider('aws-sqs') ?? registry.getDefaultProvider();

if (!queue) throw new Error('No queue provider available');

// Create first: BullMQ addresses one queue slot per instance.
await queue.createQueue('product.events');
await queue.enqueue(envelope, { queueId: 'product.events', createIfNotExists: true });
```

This mirrors `ensureQueue` / `selectQueue` in
`src/modules/reactory-product/events/index.ts:328` and `:349`. A complete
before/after migration is in [migration.md](./migration.md).

---

## 6. UI surface

**There is none.** The module contributes:

| Surface | Value | Evidence |
|---|---|---|
| Forms | `[]` | `forms/index.ts:1` |
| Express routes | `{}` | `routes/index.ts:1` |
| Client plugins | `[]` | `reactory-queue/index.ts:25` |
| Views | `[]` | `views/index.ts:1` |
| CLI commands | `[]` | `cli/index.ts:1` |
| Schema definitions | `[]` | `schema/index.ts:1` |

There is no queue-management screen, no depth widget, no retry button and no
drain action in the client. Because §4 contributes no GraphQL either, a UI would
have to be built in another module and would need a resolver that does not exist
here. Use the backend's own console or tooling instead.

---

## 7. Workflows

### The module contributes no workflow surface

`workflow/index.ts:1` exports an empty array: no step types, no YAML flows, no
schedules. Queue-backed workflow invocation is not implemented *by this module*.

### The reverse integration lives in `reactory-core`

`reactory-core` ships a listener that turns queue messages into workflow
invocations:

| Property | Value | Evidence |
|---|---|---|
| Service FQN | `reactory.WorkflowQueueListener@1.0.0` | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:14` |
| Dependency | `reactory.QueueProvider@1.0.0` | `QueueListener.ts:20` |
| Poll interval | `props.pollInterval ?? 5000` ms | `QueueListener.ts:47` |
| Batch size | `max: 10` per poll | `QueueListener.ts:161` |
| Queue source | `getDefaultProvider()` — the **default** provider only | `QueueListener.ts:155` |

**Message contract** — the listener ignores anything without `body.workflowId`:

```json
{
  "header": { "id": "<any>", "receivedTimestamp": 0, "provider": "..." },
  "body": { "workflowId": "<workflow id or FQN>", "id": "<request id>", "data": { } }
}
```

`workflowId` is required; `data` is passed as the workflow input
(`QueueListener.ts:185-199`). A malformed body is deleted and ignored
(`QueueListener.ts:190`). A throw during invocation leaves the message in place
(`QueueListener.ts:206`).

### Two reasons this integration is dormant

1. **Nothing starts it.** `onStartup` resolves the provider and returns; it never
   calls `startListening()` (`QueueListener.ts:54-61`). `startListening` also
   refuses to run until `setWorkflowInvoker` has been called
   (`QueueListener.ts:89`). The only call sites in the tree are in the spec
   (`QueueListener.spec.ts:127`).
2. **Its ack only works on SQS.** The listener reads with `receiveMessages` (a
   peek) and acks with `deleteMessage(message.header.id)` (`QueueListener.ts:161`,
   `:202`). Only the SQS adapter rewrites `header.id` to a receipt handle
   (`AWSSQSService.ts:260`); on BullMQ and in-memory that id is the producer's
   envelope id, so the delete is a no-op and the same batch is re-processed on
   every poll.

If you need queue-triggered workflows today, run the listener yourself, use SQS,
and make the invoked workflows idempotent.

---

## 8. Operations

### 8.1 Startup and health checks

| Provider | What `onStartup` does | Evidence |
|---|---|---|
| `bullmq` | Adds a job to `healthCheckQueue`, starts a worker, closes the worker on completion; logs a failure but does not throw | `BullMessageQueueService.ts:147-169` |
| `in-memory` | Enqueues a health message and immediately shifts it off | `InMemoryQueueService.ts:113-137` |
| `aws-sqs` | Sends a health message **only when a queue URL is configured**; otherwise warns and returns | `AWSSQSService.ts:290-320` |
| `QueueProvider` | Calls every registered adapter's `onStartup`; one adapter's failure does not block the others | `QueueProvider.ts:254-276` |

The SQS guard exists because the module's built-in URL is a placeholder; without
it every boot attempted a health check against a non-existent queue and logged a
credentials error (`AWSSQSService.spec.ts:3-10`).

The health check runs on the instance `ServiceManager.startServices` constructs
for it (`src/services/ServiceManager.ts:331`). With `instance` lifecycle that is
not the instance your request handlers receive (§9.2).

### 8.2 Delivery semantics

| Primitive | `bullmq` | `in-memory` | `aws-sqs` |
|---|---|---|---|
| `enqueue` | adds | appends | sends |
| `receiveMessages` | **peek** | **peek** | **peek** (visibility timeout starts) |
| `dequeue` | broken | **removes** | receives, **does not remove** |
| remove/ack | `deleteMessage(jobId)` | `deleteMessage(queueId-index)` | `deleteMessage(receiptHandle)` |

None of the primitives is transactional and none is exactly-once. Consumers that
call `dequeue` and then re-enqueue on failure get **at-least-once** delivery; that
is the design recorded in
`src/modules/reactory-payment/queues/PaymentInboundQueueConsumer.ts:30-36`.
Consumers that call `receiveMessages` and ack with the envelope id get a
**redelivery loop** on two of the three providers.

### 8.3 Retry and backoff

The abstraction has no retry policy. There is no `retry` option, no default
`attempts`, and no backoff calculation anywhere in the module.

Retry is implemented by consumers:

| Consumer | Policy | Evidence |
|---|---|---|
| `reactory-communicator` | 5 attempts max; delay `2^retryCount * 1000 ms`; then `communicator.dlq` | `src/modules/reactory-communicator/services/CommunicatorQueueService.ts:40-47`, `:309-325`, `:372` |
| `reactory-payment` inbound | `REACTORY_PAYMENT_CONSUMER_MAX_ATTEMPTS` (default 3), attempt count persisted in `reactory_payment_inbound_events`, dead-lettered at the cap | `PaymentInboundQueueConsumer.ts:182-184`, `:380-400` |
| `reactory-core` workflow listener | none — on error the message is left in place for the next poll | `QueueListener.ts:205-207` |

BullMQ is the only provider that can apply a retry policy at the backend, and only
when the caller passes `attempts` and `backoff` as job options, which are forwarded
verbatim (`BullMessageQueueService.ts:102`; pinned by
`EnqueueCreateIfNotExists.spec.ts:259-274`).

### 8.4 Dead-letter behaviour

`IEnqueueOptions` declares `responseQueueId` and `failureQueueId`
(`types.ts:12-13`). **Neither is implemented by any provider.** The BullMQ adapter
destructures and discards them (`BullMessageQueueService.ts:92-100`); the
in-memory and SQS adapters ignore them. There is no dead-letter queue, no
poison-message counter and no redrive in this module.

What exists is application-level:

- `communicator.dlq` is a normal queue the communicator writes to when it
  exhausts its own retries (`CommunicatorQueueService.ts:47`, `:372`).
- `reactory-payment` marks an inbox row `DEAD_LETTERED` and acks the envelope
  (`PaymentInboundQueueConsumer.ts:382-388`).
- SQS redrive policies are a property of the AWS queue, not of this module; the
  module neither sets nor reads one.

### 8.5 Concurrency

- The module starts no worker pool and exposes no concurrency setting.
- The only BullMQ worker is the health check
  (`BullMessageQueueService.ts:154`).
- The workflow listener polls each queue on a timer and processes its batch
  **sequentially** (`QueueListener.ts:150-176`).
- The payment consumer polls on an interval and processes a batch sequentially
  (`PaymentInboundQueueConsumer.ts:226-237`).
- Throughput therefore comes from running more server processes, not from
  configuring this module.

### 8.6 Tenant scoping

**There is no tenant dimension in this module.** A queue id is a plain string; no
provider prefixes it with a client, partner or tenant, and no registry records
which tenant owns a queue. The payment inbox is deliberately tenant-agnostic —
dedupe is keyed on the globally unique envelope id precisely because an event can
arrive before a tenant is resolvable
(`PaymentInboundQueueConsumer.ts:194-199`).

What that means in practice:

- A queue is shared by every tenant served by that deployment process.
- Any code that can name a queue can read every tenant's messages on it.
- The only tenant boundary is the one the consumer enforces on the **payload**.

Guidance, in order of preference:

1. **Default — one queue per event domain per deployment, tenant in the payload.**
   Names such as `product.events` and `payment.events` are the existing pattern
   (`src/modules/reactory-product/events/index.ts:68`, `:75`). Carry `clientId` /
   tenant identity in the envelope body and authorise in the handler. Never infer
   the tenant from the queue name.
2. **Hard isolation — tenant-qualified queue ids at the call site.** Use
   `product.events.${clientId}` and start one consumer per tenant. This multiplies
   SQS queues and Redis keys and is not managed for you; the SQS URL cache is
   per-instance and BullMQ has a single queue slot, so a tenant-qualified scheme
   must be applied consistently by every producer and consumer.
3. **Do not** rely on provider-level IAM alone for tenant isolation. SQS IAM
   separates deployments, not tenants within a deployment.

### 8.7 Telemetry

The module emits **no metrics and no traces**. Its only observability is
`context.log` / `warn` / `error` calls (`QueueProvider.ts:132`,
`AWSSQSService.ts:304`).

`bullmq-otel` is declared as a dependency (`package.json:12`) but is imported
nowhere in the module. The telemetry module has no queue instrumentation either;
its only queue-related code is a demo gauge
(`src/modules/reactory-telemetry/demo/TelemetryDemo.ts:77`).

Instrument at the consumer, where the semantics are known. `communicator` is the
worked example: it implements `IReactoryTelemetryAwareService` and decorates
`moveToRetryQueue` with `@metric('communicator.queue.retry', …)`
(`CommunicatorQueueService.ts:68`, `:293-300`).

### 8.8 Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `Queue provider 'bullmq' not found` | Adapter not enabled, or construction threw and was swallowed | Set `REACTORY_QUEUE_BULLMQ_ENABLED=true`; check the startup log for `Failed to initialize BullMQ provider` |
| `getDefaultProvider()` returns the in-memory adapter despite `REACTORY_QUEUE_PROVIDER=bullmq` | `REACTORY_QUEUE_PROVIDER` is shadowed by the hard-coded default (§9.1) | Pass `queueConfig.defaultProvider` in props, or call `setDefaultProvider('bullmq')` on the instance you use |
| Messages enqueued by one service are never seen by another | Each `getService()` creates a new provider and a new in-memory `Map` (§9.2) | Use a shared/durable provider, or resolve one provider and pass it explicitly |
| `No message found in queue.` from `dequeue()` on BullMQ | `dequeue()` looks up the fixed id `enqueueJob` (§9.3) | Read with `receiveMessages()` or use SQS/in-memory for `dequeue` |
| Redis still contains a queue after `deleteQueue()` | `deleteQueue` drains and closes; it does not delete keys (`BullMessageQueueService.ts:141-145`) | Delete the keys with Redis tooling |
| `Queue <id> does not exist.` | In-memory requires creation; `createIfNotExists` was not set | Call `createQueue(id)` first, or pass `createIfNotExists: true` |
| `CredentialsProviderError` on boot | SQS adapter health check against the placeholder URL | Set a real `DEFAULT_SQS_QUEUE_URL` / `HEALTH_CHECK_SQS_QUEUE_URL`, or leave SQS disabled |
| Same message processed on every poll | Consumer peeks and acks with the envelope id | Ack with the receipt handle (SQS), or use `dequeue` + re-enqueue |
| `queueService.addProcessor is not a function` | The consumer calls a method the contract never defined (§9.15) | Implement consumers against `IQueueService` only |

---

## 9. Limitations and roadmap

Each item is a present-tense limitation with evidence. The roadmap list at the end
is intent, not commitment.

### 9.1 `REACTORY_QUEUE_PROVIDER` cannot select the default provider

`loadConfiguration` returns a default object whose `defaultProvider` is already
`'in-memory'` (`QueueProvider.ts:75-76`, `:100`). The constructor then evaluates
`this.config.defaultProvider || process.env.REACTORY_QUEUE_PROVIDER || 'in-memory'`
(`QueueProvider.ts:65`). The first operand is always truthy, so the environment
variable is dead code.

Setting `REACTORY_QUEUE_BULLMQ_ENABLED=true` registers BullMQ but leaves the
default on in-memory. Because `instance` lifecycle gives each caller a fresh
registry (§9.2), the consequence is that `getDefaultProvider()` in a consumer
returns a brand-new, empty in-memory queue.

Workarounds: pass `queueConfig.defaultProvider` through props, or resolve one
provider instance and call `setDefaultProvider('bullmq')` on it before use, or ask
for the key explicitly with `getProvider('bullmq')`.

### 9.2 Every resolution builds a new registry and new adapters

`QueueProvider` declares no `lifeCycle`, so the decorator assigns `instance`
(`src/application/decorators/service.ts:36`) and `ServiceManager` constructs a new
instance per `getService()` call (`src/services/ServiceManager.ts:120`, `:203`).
It is not cached (`:264` caches singletons only).

Consequences:

- `registerProvider`, `unregisterProvider` and `setDefaultProvider` mutate one
  instance only.
- In-memory queues are per-instance. A message enqueued through one resolution is
  invisible to every other resolution, including the consumer that polls later.
- With BullMQ enabled, every resolution constructs two `new Queue(...)` objects
  (`BullMessageQueueService.ts:53`, `:61`), i.e. additional Redis connections per
  call site.
- `onStartup` runs on the throwaway instance created by `startServices`
  (`src/services/ServiceManager.ts:331`), not on the instances consumers use.

In-tree consumers work around this by resolving the provider at the point of use
and never assuming shared state (`reactory-product/events/index.ts:307-315`), and
by treating in-memory as a same-instance fallback only.

### 9.3 BullMQ `dequeue()` cannot find a job

`enqueue` adds a job whose **name** is `enqueueJob` and whose **id** is generated
by BullMQ (`BullMessageQueueService.ts:102`). `dequeue` calls
`this.queue.getJob('enqueueJob')` (`BullMessageQueueService.ts:107`), which looks a
job up by id. It therefore normally finds nothing and throws
`No message found in queue.`. The unit test passes because it mocks `getJob`
(`EnqueueCreateIfNotExists.spec.ts:293-300`).

`receiveMessages` is unaffected and is the working read path for BullMQ.

### 9.4 BullMQ ignores its programmatic connection config

`QueueProvider` passes `providers.bullmq.config` to the constructor
(`QueueProvider.ts:127-130`), but the constructor reads only `process.env`
(`BullMessageQueueService.ts:53-68`). A `queueConfig.providers.bullmq.config.redis`
block has no effect. Use `REACTORY_REDIS_*`.

### 9.5 The SQS adapter has stubs where the contract expects behaviour

| Method | Behaviour | Evidence |
|---|---|---|
| `count()` | Returns `-1` | `AWSSQSService.ts:265-268` |
| `createQueue()` | Returns `true` without calling AWS | `AWSSQSService.ts:271-274` |
| `deleteQueue()` | Returns `true` without calling AWS | `AWSSQSService.ts:276-279` |
| `deleteMessage()` | Always uses `this.queueUrl`, ignoring `options.queueId` | `AWSSQSService.ts:237-242` |

### 9.6 `responseQueueId` and `failureQueueId` are inert

Declared in the contract (`types.ts:12-13`), discarded by BullMQ
(`BullMessageQueueService.ts:92-100`) and ignored by the other adapters. Reply
routing and failure routing must be done by the caller.

### 9.7 No retry, backoff or DLQ primitive

See §8.3 and §8.4. Every consumer reimplements the policy, with different defaults:
5 attempts in communicator, 3 in payment, unlimited poll-retry in the workflow
listener.

### 9.8 `receiveMessages` is a peek; only SQS yields a usable ack id

`receiveMessages` never removes on any provider. `deleteMessage` is keyed
differently per provider (§3). Only SQS rewrites `header.id` to the receipt handle
(`AWSSQSService.ts:260`), so a peek-then-ack loop drains only on SQS.

### 9.9 No tenant scoping

See §8.6. No queue id, registry entry or provider call carries a tenant.

### 9.10 No GraphQL, UI, routes or workflow contributions

`graph/index.ts:1`, `forms/index.ts:1`, `routes/index.ts:1`,
`workflow/index.ts:1`, `reactory-queue/index.ts:25`. Queue state cannot be inspected
or controlled through the platform API.

### 9.11 No telemetry

`bullmq-otel` is declared (`package.json:12`) and never imported; no metrics or
spans are emitted (§8.7).

### 9.12 The licence is stated three different ways

| Source | Value | Evidence |
|---|---|---|
| Registry | `private` | `available.json:48` |
| `package.json` | `MIT` | `package.json:8` |
| `LICENSE` file | Apache 2.0 | `LICENSE:1` |

This must be reconciled before the module is distributed or documented as
open-source.

### 9.13 The module's own docs overstate the surface

| Claim | Where | Reality |
|---|---|---|
| "GraphQL endpoints" | `AGENT.md:5`, `:63` | `graph/index.ts:1` is `{}` |
| "gRPC/protobuf support" | `AGENT.md:5`, `:62` | `protobuf/index.ts:1` is `[]` |
| "OpenTelemetry instrumentation" | `AGENT.md:5`, `:61` | `bullmq-otel` is never imported |
| "Runtime provider switching" by env | `services/queue/README.md` and `MIGRATION_GUIDE.md` | `REACTORY_QUEUE_PROVIDER` is shadowed (§9.1), and switching is instance-local (§9.2) |
| "Update documentation" is a migration step | `MIGRATION_GUIDE.md` checklist | This page is that documentation |

The module `README.md` is two lines (`README.md:1-2`) and does not act as a front
door.

### 9.14 In-memory message ids are positional

`enqueue` returns `` `${queueName}-${queue.length - 1}` ``
(`InMemoryQueueService.ts:64`) and `deleteMessage` splits that string and
`splice`s by index (`InMemoryQueueService.ts:76-80`). After any deletion, indices
shift; a retained id can remove a different message.

### 9.15 Consumers call methods the contract does not define

All four KYC queue wrappers call `this.queueService.addProcessor(...)`
(`src/modules/reactory-kyc/queues/VerificationQueue.ts:66`, `:72`, `:78`), but
`IQueueService` defines no `addProcessor` (`types.ts:53-95`) and no adapter
implements it. Those code paths cannot succeed against this module.

### 9.16 Documentation status

- This page and `migration.md` are the canonical narrative documentation.
- `services/queue/README.md`, `MIGRATION_GUIDE.md` and `IMPLEMENTATION_SUMMARY.md`
  remain in the module repository as contributor detail. `IMPLEMENTATION_SUMMARY.md`
  is a process artefact and should move to `_work/`.
- `AGENT.md` needs correcting per §9.13.

### Roadmap (intent, not commitment)

Derived from the module's own implementation summary
(`services/queue/IMPLEMENTATION_SUMMARY.md`, "Future Enhancements") and from the
defects above. Nothing here is implemented.

1. Make `REACTORY_QUEUE_PROVIDER` authoritative (read env before applying the
   built-in default).
2. Declare `lifeCycle: 'singleton'` on `QueueProvider` so the registry and
   in-memory state survive a resolution; or document a mandatory shared-instance
   pattern.
3. Fix BullMQ `dequeue()` to read the next waiting job rather than a fixed id.
4. Honour `props` for the BullMQ Redis connection.
5. Implement `count`, `createQueue` and `deleteQueue` for SQS, and honour
   `queueId` on `deleteMessage`.
6. Implement `failureQueueId` (dead-letter routing) in at least BullMQ and SQS.
7. Expose depth/lag metrics and wire `bullmq-otel` (or remove the dependency).
8. Add tenant-qualified queue-id helpers, or an explicit statement that tenancy is
   a consumer concern only.
9. Reconcile the licence across registry, package and `LICENSE`.

---

## 10. Evidence index

Paths are relative to the `reactory-express-server` repository root. `:n` is the
first relevant line of the cited block.

`src/modules/reactory-queue/**` resolves to the module's own git repository, which
is mounted at that path in a full checkout. The server-side citations
(`src/services/**`, `src/application/**`, `src/modules/<consumer>/**`) resolve in
the server repository. Both baselines are recorded in the front matter above.

### §1 Purpose and status

| Claim | Reference |
|---|---|
| Module definition and FQN | `src/modules/reactory-queue/index.ts:11-31` |
| Available in the registry | `src/modules/available.json:43` |
| Enabled by default | `src/modules/enabled-reactory.json:43` |
| Installed by default | `src/modules/installed.json:43` |
| No GraphQL contribution | `src/modules/reactory-queue/graph/index.ts:1` |
| No workflow contribution | `src/modules/reactory-queue/workflow/index.ts:1` |
| No forms contribution | `src/modules/reactory-queue/forms/index.ts:1` |
| No models contribution | `src/modules/reactory-queue/models/index.ts:1` |
| No telemetry implementation | `src/modules/reactory-queue/services/queue/QueueProvider.ts:132` (only `context.log`) |
| `bullmq-otel` declared | `src/modules/reactory-queue/package.json:12` |

### §2 Module contract

| Claim | Reference |
|---|---|
| `id`, `nameSpace`, `name`, `version` | `src/modules/reactory-queue/index.ts:12-15` |
| Dependencies | `src/modules/reactory-queue/index.ts:17` |
| Priority | `src/modules/reactory-queue/index.ts:18` |
| Extension-point list | `src/modules/reactory-queue/index.ts:19-30` |
| Empty protobuf/gRPC | `src/modules/reactory-queue/protobuf/index.ts:1` |
| Empty routes | `src/modules/reactory-queue/routes/index.ts:1` |
| Empty CLI | `src/modules/reactory-queue/cli/index.ts:1` |
| FQN derivation rule | `src/application/decorators/service.ts:14` |
| Registry FQN and entry | `src/modules/available.json:46-47` |

### §3 Data model

| Claim | Reference |
|---|---|
| No ORM models | `src/modules/reactory-queue/models/index.ts:1` |
| Envelope shape | `src/modules/reactory-queue/services/queue/types.ts:5` |
| Envelope header fields | `src/modules/reactory-queue/services/queue/types.ts:97` |
| Envelope body fields | `src/modules/reactory-queue/services/queue/types.ts:112` |
| `EventEnvelope` alias | `src/modules/reactory-queue/services/queue/types.ts:119` |
| `QueueServiceType` alias | `src/modules/reactory-queue/services/queue/types.ts:121` |
| BullMQ queue names and construction | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:13-14`, `:53`, `:61` |
| BullMQ single queue slot | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:136` |
| In-memory map | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:38`, `:41-43` |
| SQS base URL and URL cache | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:92`, `:76` |
| In-memory id format | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:64` |
| SQS receipt handle rewrite | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:260` |

### §4 GraphQL API

| Claim | Reference |
|---|---|
| Empty graph definitions | `src/modules/reactory-queue/graph/index.ts:1` |
| BullMQ count / delete / create | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:127-143` |
| In-memory peek / create / delete | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:88-110` |
| SQS receive / count / create / delete | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:249-278` |

### §5 Services

| Claim | Reference |
|---|---|
| Service list | `src/modules/reactory-queue/services/index.ts:6-11` |
| `QueueProvider` registration and roles | `src/modules/reactory-queue/services/queue/QueueProvider.ts:34-41` |
| BullMQ service registration | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:24-31` |
| In-memory service registration | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:17-24` |
| SQS service registration | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:50-57` |
| Default lifecycle is `instance` | `src/application/decorators/service.ts:36` |
| Instance services are not cached | `src/services/ServiceManager.ts:120`, `:203`, `:264` |
| Default provider resolution | `src/modules/reactory-queue/services/queue/QueueProvider.ts:65` |
| Built-in default config | `src/modules/reactory-queue/services/queue/QueueProvider.ts:75-100` |
| Adapter registration conditions | `src/modules/reactory-queue/services/queue/QueueProvider.ts:120-165` |
| BullMQ connection from env | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:53-68` |
| BullMQ forwards job options | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:85-104` |
| SQS honours props | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:86-96` |
| SQS queue resolution and create | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:141-194` |
| SQS create-propagation retry | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:206-226` |
| In-memory `createIfNotExists` | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:48-65` |
| In-tree `ensureQueue` / `selectQueue` pattern | `src/modules/reactory-product/events/index.ts:328`, `:349` |

### §6 UI surface

| Claim | Reference |
|---|---|
| No forms | `src/modules/reactory-queue/forms/index.ts:1` |
| No routes | `src/modules/reactory-queue/routes/index.ts:1` |
| No client plugins | `src/modules/reactory-queue/index.ts:25` |
| No views | `src/modules/reactory-queue/views/index.ts:1` |
| No CLI | `src/modules/reactory-queue/cli/index.ts:1` |
| No schema definitions | `src/modules/reactory-queue/schema/index.ts:1` |

### §7 Workflows

| Claim | Reference |
|---|---|
| No workflow contribution | `src/modules/reactory-queue/workflow/index.ts:1` |
| Listener FQN and dependency | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:14`, `:20` |
| Poll interval default | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:47` |
| Batch size | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:161` |
| `workflowId` requirement | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:185` |
| Invocation and ack | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:199-202` |
| Message retained on error | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:206` |
| Listener never self-starts | `src/modules/reactory-core/workflow/QueueListener/QueueListener.ts:54-61` |
| Only call sites are in the spec | `src/modules/reactory-core/workflow/QueueListener/QueueListener.spec.ts:127` |

### §8 Operations

| Claim | Reference |
|---|---|
| BullMQ health check | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:147-169` |
| In-memory health check | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:113-137` |
| SQS health-check guard | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:290-320` |
| SQS guard rationale | `src/modules/reactory-queue/services/queue/AWSSQSService.spec.ts:3-10` |
| Provider startup fan-out | `src/modules/reactory-queue/services/queue/QueueProvider.ts:254-276` |
| `onStartup` runs on a throwaway instance | `src/services/ServiceManager.ts:331` |
| At-least-once consumer design | `src/modules/reactory-payment/queues/PaymentInboundQueueConsumer.ts:30-36` |
| Communicator retry constants | `src/modules/reactory-communicator/services/CommunicatorQueueService.ts:40-47` |
| Communicator exponential backoff | `src/modules/reactory-communicator/services/CommunicatorQueueService.ts:322` |
| Communicator DLQ | `src/modules/reactory-communicator/services/CommunicatorQueueService.ts:372` |
| Payment attempt cap | `src/modules/reactory-payment/queues/PaymentInboundQueueConsumer.ts:182-184` |
| Payment dead-letter | `src/modules/reactory-payment/queues/PaymentInboundQueueConsumer.ts:382-388` |
| `failureQueueId` declared | `src/modules/reactory-queue/services/queue/types.ts:13` |
| `failureQueueId` discarded | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:97` |
| Tenant-agnostic inbox | `src/modules/reactory-payment/queues/PaymentInboundQueueConsumer.ts:194-199` |
| Fixed queue names | `src/modules/reactory-product/events/index.ts:68`, `:75` |
| No queue instrumentation in telemetry | `src/modules/reactory-telemetry/demo/TelemetryDemo.ts:77` |
| Consumer-level metric example | `src/modules/reactory-communicator/services/CommunicatorQueueService.ts:293` |

### §9 Limitations

| Claim | Reference |
|---|---|
| Env default is shadowed | `src/modules/reactory-queue/services/queue/QueueProvider.ts:65`, `:75-100` |
| `instance` lifecycle | `src/application/decorators/service.ts:36` |
| New instance per resolution | `src/services/ServiceManager.ts:120`, `:203` |
| BullMQ dequeue by id | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:102`, `:107` |
| BullMQ dequeue test mocks `getJob` | `src/modules/reactory-queue/services/queue/EnqueueCreateIfNotExists.spec.ts:293-300` |
| BullMQ props ignored | `src/modules/reactory-queue/services/queue/BullMessageQueueService.ts:51-68` |
| SQS stubs | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:265-279` |
| SQS delete ignores `queueId` | `src/modules/reactory-queue/services/queue/AWSSQSService.ts:237-242` |
| In-memory positional ids | `src/modules/reactory-queue/services/queue/InMemoryQueueService.ts:64`, `:76-80` |
| KYC `addProcessor` call | `src/modules/reactory-kyc/queues/VerificationQueue.ts:66` |
| Contract has no `addProcessor` | `src/modules/reactory-queue/services/queue/types.ts:53-95` |
| Licence: registry | `src/modules/available.json:48` |
| Licence: package | `src/modules/reactory-queue/package.json:8` |
| Licence: file | `src/modules/reactory-queue/LICENSE:1` |
| AGENT.md overclaims | `src/modules/reactory-queue/AGENT.md:5`, `:61-63` |
| Two-line module README | `src/modules/reactory-queue/README.md:1-2` |

### Verification

The citations above were checked against
`reactory-express-server@59639fe` and `reactory-queue@349ce0a` on 2026-10-19.