---
title: Migrating to reactory-queue
status: Implemented
owner: platform
verified: 2026-10-19
verifiedAgainst: reactory-express-server@59639fe / reactory-queue@349ce0a
audience: developer
---

# Migrating to `reactory-queue`

This is the reader-facing migration path for code that constructs
`BullMessageQueueService`, `InMemoryQueueService` or `AWSSQSQueueService` directly.
It replaces the module repository's 406-line `services/queue/MIGRATION_GUIDE.md`
for day-to-day use; the original remains the contributor reference and is linked at
the end.

> Read [`overview.md`](./overview.md) first. §5 defines the provider decision and
> the capability differences; §9 lists the defects a migration must not walk into.

## 1. What changes

| Before | After |
|---|---|
| `new InMemoryQueueService(props, context)` | `context.getService('reactory.QueueProvider@1.0.0')` then `getProvider('in-memory')` |
| The queue implementation is compiled into the caller | The provider is chosen by configuration |
| A backend swap means editing the caller | A backend swap means changing config — but see the caveat in step 2 |
| Each caller owns the backend connection | Each `getService()` call constructs its own provider (overview §9.2) |

The interface does not change. Every adapter implements `IQueueService`
(`src/modules/reactory-queue/services/queue/types.ts:53`), so the call sites stay
the same once you hold an adapter.

## 2. Steps

### Step 1 — Resolve the registry, not an adapter class

```ts
// Before
import { InMemoryQueueService } from '@reactory/server-modules/reactory-queue/services/queue/InMemoryQueueService';

this.queueService = new InMemoryQueueService(props, context);
```

```ts
// After
import type { QueueProvider } from '@reactory/server-modules/reactory-queue/services/queue/QueueProvider';

const registry = context.getService<QueueProvider>('reactory.QueueProvider@1.0.0');
const queueService = registry.getProvider('in-memory'); // or getProvider('bullmq' | 'aws-sqs')
if (!queueService) throw new Error('No queue provider available');
```

Prefer `getProvider('<key>')` over `getDefaultProvider()` until overview §9.1 is
fixed: the default is hard-coded to `in-memory` and `REACTORY_QUEUE_PROVIDER` is
shadowed.

### Step 2 — Configure the backend

```bash
# Redis / BullMQ
REACTORY_QUEUE_BULLMQ_ENABLED=true
REACTORY_REDIS_HOST=localhost
REACTORY_REDIS_PORT=6379
REACTORY_REDIS_PASSWORD=reactory

# AWS SQS
REACTORY_QUEUE_AWS_SQS_ENABLED=true
AWS_REGION=us-east-1
DEFAULT_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/defaultQueue
HEALTH_CHECK_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/healthCheckQueue
```

The full variable table is in [`overview.md` §5.4](./overview.md#54-configuration).

If you need the default to be something other than `in-memory`, either pass
`queueConfig.defaultProvider` when constructing the provider, or call
`setDefaultProvider(key)` on the instance you actually use. A module-level
`REACTORY_QUEUE_PROVIDER` change will not take effect (overview §9.1).

Do not pass `providers.bullmq.config.redis` and expect it to be used — the BullMQ
adapter reads `process.env` only (overview §9.4).

### Step 3 — Create the queue before the first enqueue

The providers do not agree on implicit creation:

| Provider | Behaviour |
|---|---|
| `in-memory` | Throws `Queue <id> does not exist.` unless the queue exists or `createIfNotExists: true` is passed |
| `aws-sqs` | Looks the name up; creates only when `createIfNotExists: true` and only on a genuine "does not exist" error |
| `bullmq` | Creates on first `add`, but targets **one queue slot** per instance — call `createQueue(id)` to select it |

The safe sequence for all three:

```ts
await queueService.createQueue(queueId);
await queueService.enqueue(envelope, { queueId, createIfNotExists: true });
```

This is the `ensureQueue` / `selectQueue` pattern used by
`src/modules/reactory-product/events/index.ts:328` and `:349`.

### Step 4 — Match the read primitive to the provider

| You want | Call | Works on |
|---|---|---|
| Peek a batch without removing | `receiveMessages({ queueId, max })` | all three, but `queueId` is ignored on BullMQ |
| Take and remove exactly one | `dequeue(queueId)` | `in-memory` only; BullMQ's `dequeue` is broken (overview §9.3) and SQS's `dequeue` does not delete |
| Ack after a peek | `deleteMessage(id)` | SQS only, and `id` must be the receipt handle that `receiveMessages` wrote into `header.id` |

For a consumer that must not lose messages, use the payment consumer's shape:
take with `dequeue`, re-enqueue on failure, and keep a durable attempt count
(`src/modules/reactory-payment/queues/PaymentInboundQueueConsumer.ts:30-36`).

### Step 5 — Update tests

Point tests at the in-memory adapter through the registry, and construct the
provider directly so you do not depend on the service manager:

```ts
const context = createMockContext();
const registry = new QueueProvider(
  {
    queueConfig: {
      defaultProvider: 'in-memory',
      providers: { 'in-memory': { enabled: true, config: {} } },
    },
  },
  context,
);
const queue = registry.getDefaultProvider()!;
```

Then inject it:

```ts
context.getService = jest.fn((id: string) =>
  id === 'reactory.QueueProvider@1.0.0' ? registry : undefined,
) as any;
```

The module's own suites are the reference:
`services/queue/QueueProvider.spec.ts` and
`services/queue/EnqueueCreateIfNotExists.spec.ts`.

### Step 6 — Delete the direct construction

Search for the adapter class names and remove every `new`:

```bash
grep -rn "new BullMessageQueueService\|new InMemoryQueueService\|new AWSSQSQueueService" src/
```

Importing the class for a type annotation is fine; constructing it is not.

## 3. Migration checklist

- [ ] No `new BullMessageQueueService` / `new InMemoryQueueService` / `new AWSSQSQueueService` in application code
- [ ] The provider is resolved by FQN, not by importing an adapter
- [ ] The queue is created, or `createIfNotExists: true` is passed
- [ ] The read primitive matches the chosen provider
- [ ] The ack id matches the chosen provider
- [ ] The consumer is idempotent, because delivery is at-least-once
- [ ] Retry and dead-letter policy are implemented in the consumer, not assumed from the module
- [ ] Tests use the in-memory adapter through a locally constructed provider
- [ ] No tenant isolation is assumed from the queue name

## 4. Full contributor guide

The original guide in the module repository covers the same ground with more
examples and a troubleshooting section:

- `src/modules/reactory-queue/services/queue/MIGRATION_GUIDE.md`
- `src/modules/reactory-queue/services/queue/QueueProvider.example.ts`

They are contributor detail, not the authority for behaviour. Where they disagree
with [`overview.md`](./overview.md), this page is correct.
