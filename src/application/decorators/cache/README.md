# `@cached` decorator

A TypeScript method decorator that transparently caches method return values in Redis, eliminating repetitive boilerplate for get-or-compute patterns.

---

## Contents

- [Installation / import](#installation--import)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Cache key templates](#cache-key-templates)
- [Options reference](#options-reference)
- [Fail-open behaviour](#fail-open-behaviour)
- [Recipes](#recipes)
  - [Simple TTL cache](#simple-ttl-cache)
  - [Object argument as key](#object-argument-as-key)
  - [GraphQL resolver (context in params)](#graphql-resolver-context-in-params)
  - [Custom serialiser / deserialiser](#custom-serialiser--deserialiser)
  - [Permanent cache (no expiry)](#permanent-cache-no-expiry)
- [Cache invalidation](#cache-invalidation)

---

## Installation / import

```typescript
import { cached } from '@reactory/server-core/application/decorators/cache';
// or via the barrel:
import { cached } from '@reactory/server-core/application/decorators';
```

`RedisService` must be registered in the Reactory service container as `core.RedisService@1.0.0`.

---

## Quick start

```typescript
import { cached } from '@reactory/server-core/application/decorators/cache';

class ModelService {
  context: IReactoryContext;

  @cached('models:${0}:${1}', { ttl: 300 })
  async getModel(nameSpace: string, version: string) {
    return this.db.loadModel(nameSpace, version);  // called only on a cache miss
  }
}
```

---

## How it works

```
caller
  │
  ▼
@cached wrapper
  │
  ├── resolve key template with args
  │
  ├── Redis GET(key)
  │     hit ──────────────────────────────────────► return deserialised(hit)
  │     miss
  │       │
  │       ▼
  │   original method executes
  │       │
  │       ▼
  │   Redis SET(key, serialise(result), ttl?)
  │
  └──► return result
```

On every call the decorator:

1. Resolves the cache key by substituting `${n}` placeholders from the method arguments.
2. Calls `RedisService.get(key)` — if the value exists it is deserialised and returned **immediately**, bypassing the method body entirely.
3. On a cache miss the original method runs, and the result is serialised and stored in Redis (with an optional TTL).
4. Errors in the cache layer are logged but **never propagate** — the method always executes as a fallback.

---

## Cache key templates

The key string supports `${n}` and `${n.prop}` placeholders resolved against the method's positional arguments (zero-based):

| Template | Args | Resolved key |
|----------|------|--------------|
| `'models:${0}:${1}'` | `['crm', 'v2']` | `models:crm:v2` |
| `'user:${0.id}'` | `[{ id: 42 }]` | `user:42` |
| `'config:${0.tenant}.${1}'` | `[{ tenant: 'acme' }, 'prod']` | `config:acme.prod` |
| `'static-key'` | *(any)* | `static-key` |

When an argument is an object and no nested property is specified, it is serialised to a stable JSON string so the entire object forms part of the key.

> Choose keys that are specific enough to avoid collisions between different callers passing different arguments but the same positional values.

---

## Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | none (no expiry) | Time-to-live in seconds. Omit for a persistent entry. |
| `contextSource` | `'instance' \| 'params'` | `'instance'` | Where to find the Reactory context. |
| `serialise` | `(value: any) => string` | `JSON.stringify` | Custom serialiser for the cached value. |
| `deserialise` | `(raw: string) => any` | `JSON.parse` | Custom deserialiser for reading from Redis. |

### `contextSource`

| Value | When to use |
|-------|-------------|
| `'instance'` (default) | Service class where context is stored as `this.context` |
| `'params'` | GraphQL resolver where context is passed as a method argument |

---

## Fail-open behaviour

| Scenario | Behaviour |
|----------|-----------|
| No Reactory context found | Logs a warning, executes method normally (no cache) |
| `RedisService` not registered | Logs a warning, executes method normally (no cache) |
| Redis GET fails | Logs an error, falls through to the method |
| Redis SET fails | Logs an error, returns the method result anyway |
| Original method throws | Error propagates — nothing is written to the cache |

The decorator will **never cause your method to fail** due to a Redis problem.

---

## Recipes

### Simple TTL cache

```typescript
@cached('permissions:${0}', { ttl: 60 })
async getUserPermissions(userId: string) {
  return this.permissionRepo.findByUser(userId);
}
```

### Object argument as key

When the argument is a whole object (e.g. a query filter), omit the property path and the object is JSON-stringified as part of the key:

```typescript
@cached('reports:${0}', { ttl: 600 })
async getReport(filter: ReportFilter) {
  return this.reportService.run(filter);
}
// key example: reports:{"startDate":"2026-01-01","type":"monthly"}
```

### GraphQL resolver (context in params)

GraphQL resolvers typically receive the Reactory context as a method argument rather than via `this.context`:

```typescript
class ConfigResolver {
  @cached('tenant:config:${0.tenantId}', { ttl: 120, contextSource: 'params' })
  async getTenantConfig(args: { tenantId: string }, context: IReactoryContext) {
    return this.configService.load(args.tenantId);
  }
}
```

### Custom serialiser / deserialiser

Useful for data that doesn't round-trip cleanly through JSON (Dates, Maps, class instances):

```typescript
import superjson from 'superjson';

@cached('events:${0}', {
  ttl: 300,
  serialise: superjson.stringify,
  deserialise: superjson.parse,
})
async getEvents(streamId: string) {
  return this.eventStore.load(streamId);
}
```

### Permanent cache (no expiry)

Omit `ttl` for values that should persist until explicitly deleted:

```typescript
@cached('schema:${0}')
async getSchemaDefinition(schemaId: string) {
  return this.schemaRepo.findById(schemaId);
}
```

---

## Cache invalidation

The `@cached` decorator does not provide automatic invalidation. To clear an entry, call `RedisService.del(key)` directly with the same resolved key:

```typescript
async updateSchema(schemaId: string, data: SchemaData) {
  const result = await this.schemaRepo.save(schemaId, data);
  const redis = this.context.getService<RedisService>('core.RedisService@1.0.0');
  await redis.del(`schema:${schemaId}`);
  return result;
}
```

For bulk invalidation, use `redis.del` with multiple keys, or leverage `redis.client.keys()` with a pattern (use carefully in production).
