# Telemetry decorators

A suite of TypeScript method decorators that instrument code with OpenTelemetry metrics and distributed tracing **without modifying the method body**.

---

## Contents

- [Installation / import](#installation--import)
- [Decorators overview](#decorators-overview)
- [`@metric`](#metric)
  - [How it works](#how-it-works)
  - [Options reference](#options-reference)
  - [Emitted metric names](#emitted-metric-names)
- [`@counter`](#counter)
- [`@histogram`](#histogram)
- [`@gauge`](#gauge)
- [`@traced`](#traced)
- [Context discovery](#context-discovery)
- [Fail-open behaviour](#fail-open-behaviour)
- [Recipes](#recipes)
  - [Full observability on a service method](#full-observability-on-a-service-method)
  - [Simple invocation counter](#simple-invocation-counter)
  - [Duration distribution (histogram)](#duration-distribution-histogram)
  - [Queue depth gauge](#queue-depth-gauge)
  - [Distributed trace span](#distributed-trace-span)
  - [Combining decorators](#combining-decorators)
  - [Sampling for high-throughput paths](#sampling-for-high-throughput-paths)
- [Metric naming conventions](#metric-naming-conventions)

---

## Installation / import

```typescript
// Individual imports
import { metric }    from '@reactory/server-core/application/decorators/telemetry/metric';
import { counter }   from '@reactory/server-core/application/decorators/telemetry/counter';
import { histogram } from '@reactory/server-core/application/decorators/telemetry/histogram';
import { gauge }     from '@reactory/server-core/application/decorators/telemetry/gauge';
import { traced }    from '@reactory/server-core/application/decorators/telemetry/traced';

// Or all at once from the barrel:
import { metric, counter, histogram, gauge, traced }
  from '@reactory/server-core/application/decorators/telemetry';
```

The decorators integrate with the Reactory context's `telemetry` object (`context.telemetry`) and the global OpenTelemetry SDK (`@opentelemetry/api`). No additional service registration is required.

---

## Decorators overview

| Decorator | What it measures | Depends on |
|-----------|-----------------|------------|
| `@metric` | Everything: count, success, errors, duration | `context.telemetry` |
| `@counter` | Invocation count only (no duration) | `context.telemetry` |
| `@histogram` | Duration distribution | `context.telemetry` |
| `@gauge` | Current numeric value from the return result | `context.telemetry` |
| `@traced` | OpenTelemetry distributed trace span | `@opentelemetry/api` (global tracer) |

---

## `@metric`

The most powerful decorator. Records any combination of counters, a duration histogram, and error breakdowns in a single annotation.

```typescript
@metric('payment.charge', {
  type: 'all',          // counter + histogram + success/error tracking
  trackErrors: true,
  trackDuration: true,
  tags: { service: 'billing' },
})
async chargeCard(payment: PaymentRequest, context: IReactoryContext) { … }
```

### How it works

```
caller
  │
  ├── [sampling check] — skip if Math.random() > samplingRate
  │
  ├── resolve context + extract attributes
  │
  ├── [type includes 'counter'] ── increment {metricName}.count
  │
  ├── [trackDuration] ─────────── start timer → {metricName}.duration
  │
  ├──► original method executes
  │       success ──► increment {metricName}.success
  │       error ────► increment {metricName}.errors  (+ by errorType)
  │
  └── endTimer()   (always, via finally)
```

### Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'counter' \| 'histogram' \| 'gauge' \| 'updowncounter' \| 'all'` | `'all'` | Which metric types to emit. |
| `description` | `string` | `'<name> metric'` | Human-readable metric description. |
| `unit` | `string` | `'count'` | Measurement unit (e.g. `'seconds'`, `'bytes'`). |
| `attributesExtractor` | `(args, instance, context) => Record<string,any>` | — | Adds dynamic attributes to every data point. |
| `trackErrors` | `boolean` | `true` | Emit `{name}.errors` and `{name}.errors.{type}` on exception. |
| `trackDuration` | `boolean` | `true` | Time the method and emit `{name}.duration`. |
| `persist` | `boolean` | `true` | Forward `persist` flag to the telemetry service. |
| `contextSource` | `'request' \| 'instance' \| 'params'` | `'params'` | Where to find the Reactory context. |
| `errorClassifier` | `(error: Error) => string` | `error.constructor.name` | Converts an error to a label for `errors.{type}`. |
| `tags` | `Record<string, string>` | `{}` | Static key-value attributes added to every data point. |
| `samplingRate` | `number` | `1.0` | Fraction of calls that are instrumented (0.0–1.0). |

### Emitted metric names

For a `metricName` of `'payment.charge'`:

| Metric | Condition |
|--------|-----------|
| `payment.charge.count` | Every instrumented call (`type: 'counter'` or `'all'`) |
| `payment.charge.success` | Successful completion |
| `payment.charge.duration` | `trackDuration: true` |
| `payment.charge.errors` | Any exception |
| `payment.charge.errors.{ErrorClass}` | Per error type (e.g. `errors.ValidationError`) |

---

## `@counter`

A focused wrapper around `@metric` that records only invocation counts, with no duration tracking.

```typescript
@counter('user.registration', { description: 'New user registrations' })
async registerUser(dto: RegisterDto, context: IReactoryContext) { … }
```

Internally calls `metric(name, { type: 'counter', trackDuration: false, ...options })`.

### Options

All `MetricDecoratorOptions` except `type` and `trackDuration` (both are fixed). Also accepts:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `increment` | `number` | `1` | Amount to add per invocation (reserved for future use; currently always 1). |

---

## `@histogram`

Records the time distribution of a method's execution. Useful for latency percentile analysis (p50, p95, p99).

```typescript
@histogram('db.query.duration', { description: 'Database query latency' })
async findUsers(filter: UserFilter, context: IReactoryContext) { … }
```

Internally calls `metric(name, { type: 'histogram', trackDuration: true, ...options })`.

### Options

All `MetricDecoratorOptions` except `type` (fixed to `'histogram'`). Accepts an additional `buckets` hint for future histogram configuration:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `buckets` | `number[]` | — | Histogram bucket boundaries (advisory; support depends on the telemetry backend). |

---

## `@gauge`

Records the **current value** returned by a method as a gauge metric. Unlike counters and histograms, a gauge represents a point-in-time measurement rather than an accumulation.

```typescript
@gauge('queue.pending.depth', {
  valueExtractor: (result) => result.count,
  unit: 'items',
})
async getPendingQueueDepth(context: IReactoryContext): Promise<{ count: number }> { … }
```

The gauge value is extracted from the method's **return value** after it resolves.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `description` | `string` | `'<name> gauge'` | Human-readable description. |
| `unit` | `string` | `'count'` | Measurement unit. |
| `attributesExtractor` | `(args, instance, context) => Record<string,any>` | — | Dynamic attributes. |
| `contextSource` | `'request' \| 'instance' \| 'params'` | `'params'` | Where to find the Reactory context. |
| `valueExtractor` | `(result: any) => number` | `r => typeof r === 'number' ? r : 1` | Extracts the numeric value from the method result. |
| `persist` | `boolean` | `true` | Forward `persist` flag to the telemetry service. |
| `tags` | `Record<string, string>` | `{}` | Static attributes. |

---

## `@traced`

Creates an OpenTelemetry **trace span** wrapping the method. Works independently of the Reactory context — it uses the global OTel SDK tracer.

```typescript
@traced('kyc.document.verify', {
  attributes: { module: 'kyc', component: 'verifier' },
  kind: 'client',
  recordException: true,
})
async verifyDocument(doc: KycDocument) { … }
```

On every call:
- A span is started with the given name, kind, and attributes.
- On success: `SpanStatusCode.OK` is set and the span is closed.
- On error: `SpanStatusCode.ERROR` is set, the exception is recorded (if `recordException: true`), and the error is rethrown.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attributes` | `Attributes` | `{}` | Static OTel attributes attached to the span. |
| `recordException` | `boolean` | `true` | Calls `span.recordException(error)` on failure. |
| `kind` | `'internal' \| 'server' \| 'client' \| 'producer' \| 'consumer'` | `'internal'` | OTel `SpanKind` for the span. |

### Span kinds

| Kind | Use when |
|------|----------|
| `'internal'` | Service-to-service calls within the same process |
| `'server'` | Handling an incoming request |
| `'client'` | Making an outbound HTTP / gRPC call |
| `'producer'` | Publishing to a message queue |
| `'consumer'` | Consuming from a message queue |

---

## Context discovery

The `@metric`, `@counter`, `@histogram`, and `@gauge` decorators discover the Reactory context via the `contextSource` option:

| Value | Resolution logic |
|-------|-----------------|
| `'params'` (default) | Scans method arguments for an object with a `telemetry` property |
| `'instance'` | Reads `this.context` on the class instance |
| `'request'` | Reads `args[0].context` — for Express route handlers where `req` is the first argument |

`@traced` does **not** require a Reactory context; it uses the global OTel tracer provider.

---

## Fail-open behaviour

| Scenario | Behaviour |
|----------|-----------|
| Context not found | Logs a warning, executes the method normally |
| `context.telemetry` missing | Logs a warning, executes the method normally |
| Attribute extraction throws | Logs an error, continues with base attributes only |
| `samplingRate < 1.0` and not sampled | Executes the method normally (no metrics emitted) |
| Original method throws | Error count is incremented (if `trackErrors`), timer ends, then error is rethrown |

---

## Recipes

### Full observability on a service method

```typescript
@metric('document.search', {
  trackDuration: true,
  trackErrors: true,
  tags: { service: 'documents' },
  attributesExtractor: (args) => ({ hasFilter: !!args[0]?.filter }),
})
async searchDocuments(params: SearchParams, context: IReactoryContext) {
  return this.docRepo.search(params);
}
```

Emits: `document.search.count`, `document.search.success`, `document.search.duration`, `document.search.errors`.

### Simple invocation counter

```typescript
@counter('email.sent', { description: 'Emails dispatched' })
async sendEmail(to: string, template: string, context: IReactoryContext) { … }
```

### Duration distribution (histogram)

```typescript
@histogram('payment.process.duration', {
  description: 'End-to-end payment processing latency',
  tags: { provider: 'stripe' },
})
async processPayment(charge: ChargeRequest, context: IReactoryContext) { … }
```

### Queue depth gauge

```typescript
@gauge('jobs.pending', {
  unit: 'jobs',
  valueExtractor: (result) => result.length,
  description: 'Number of pending background jobs',
})
async getPendingJobs(context: IReactoryContext): Promise<Job[]> {
  return this.queue.pending();
}
```

### Distributed trace span

```typescript
@traced('external.crm.sync', { kind: 'client', attributes: { provider: 'salesforce' } })
async syncWithCrm(userId: string) {
  return this.crmClient.push(userId);
}
```

### Combining decorators

Decorators compose cleanly — apply in outside-in order (bottom decorator executes first):

```typescript
@traced('user.create', { kind: 'server' })
@metric('user.create', { trackErrors: true, trackDuration: true })
@rateLimit({ key: 'user:create', max: 10, windowSeconds: 60 })
async createUser(dto: CreateUserDto, context: IReactoryContext) { … }
```

Execution order: `rateLimit` → `metric` → `traced` → method body.

### Sampling for high-throughput paths

```typescript
@metric('cache.lookup', {
  samplingRate: 0.05,   // instrument only 5 % of calls
  trackDuration: true,
})
async getCached(key: string, context: IReactoryContext) { … }
```

---

## Metric naming conventions

Follow a hierarchical dot-notation schema for consistent dashboards:

```
<domain>.<entity>.<operation>[.<sub-operation>]

Examples:
  auth.user.login
  payment.card.charge
  document.pdf.export
  queue.email.enqueue
```

Avoid generic names like `get`, `fetch`, or `process` without a qualifying entity. The telemetry decorator appends `.count`, `.success`, `.errors`, and `.duration` automatically — do not include these in the base name.
