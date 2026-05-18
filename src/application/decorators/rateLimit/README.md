# `@rateLimit` decorator

A TypeScript method decorator that enforces configurable call-rate limits via `RateLimiterService`, with Redis as the primary counter store and PostgreSQL as a race-safe fallback.

---

## Contents

- [Installation / import](#installation--import)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Key sources](#key-sources)
- [Template placeholders](#template-placeholders)
- [Breach behaviour](#breach-behaviour)
- [Options reference](#options-reference)
- [Fail-open behaviour](#fail-open-behaviour)
- [Recipes](#recipes)
  - [Brute-force login protection (per IP)](#brute-force-login-protection-per-ip)
  - [Per-user API quota](#per-user-api-quota)
  - [Dynamic key from argument](#dynamic-key-from-argument)
  - [Soft-fail for non-critical paths](#soft-fail-for-non-critical-paths)
  - [Custom key function](#custom-key-function)
  - [GraphQL resolver (context in params)](#graphql-resolver-context-in-params)
  - [Dynamic error messages](#dynamic-error-messages)
- [Error object shape](#error-object-shape)

---

## Installation / import

```typescript
import { rateLimit } from '@reactory/server-core/application/decorators/rateLimit';
// or via the barrel:
import { rateLimit } from '@reactory/server-core/application/decorators';
```

`RateLimiterService` must be registered as `core.RateLimiterService@1.0.0`.

---

## Quick start

```typescript
import { rateLimit } from '@reactory/server-core/application/decorators/rateLimit';

class AuthService {
  context: IReactoryContext;

  @rateLimit({ key: 'auth:login', max: 5, windowSeconds: 60, keySource: 'ip' })
  async login(username: string, password: string) {
    return this.db.authenticate(username, password);
  }
}
```

If the same IP calls `login` more than 5 times within 60 seconds, an error is thrown before the method body runs.

---

## How it works

```
caller
  │
  ▼
@rateLimit wrapper
  │
  ├── resolve Reactory context
  ├── obtain RateLimiterService
  ├── build rate-limit key from keySource + template
  │
  ├── RateLimiterService.checkLimit(key, max, windowSeconds)
  │     Redis available ──► atomic INCR / EXPIRE
  │     Redis down ────────► PostgreSQL atomic UPDATE + upsert fallback
  │
  ├── allowed ──────────────────────────────────────► original method executes
  │
  └── blocked
        softFail: false ──► throw Error (RATE_LIMIT_EXCEEDED)
        softFail: true  ──► return null
```

The counter resets automatically when the rolling window expires. Redis keys expire via `EXPIRE`; database rows detect expiry via `windowEnd`.

---

## Key sources

The final rate-limit key is `<base>:<source>:<identifier>`. The `keySource` option controls the identifier segment:

| `keySource` | Identifier used | Example final key |
|-------------|----------------|-------------------|
| `'ip'` (default) | `context.req.ip` | `auth:login:ip:10.0.0.1` |
| `'user'` | `context.user._id` | `api:query:user:u-abc` |
| `'static'` | none (base only) | `global:rpc` |
| `'param'` | dot-path into method args | `upload:${0}:param:invoices` |
| `'custom'` | return value of `keyFn` | *(fully custom)* |

---

## Template placeholders

The `key` option supports `${n}` / `${n.prop}` placeholders resolved from method arguments:

```typescript
@rateLimit({ key: 'export:${0.format}', max: 3, windowSeconds: 300 })
async exportData(options: { format: 'csv' | 'pdf' }) { … }
// key for PDF: 'export:pdf:ip:10.0.0.1'
```

---

## Breach behaviour

### Hard fail (default)

An `Error` is thrown with `extensions` metadata attached, compatible with GraphQL error handling:

```typescript
error.message = 'Rate limit exceeded. Please try again later.';
error.extensions = {
  code: 'RATE_LIMIT_EXCEEDED',
  remaining: 0,
  resetIn: 42,   // seconds until the window resets
};
```

### Soft fail

When `softFail: true` the decorator returns `null` instead of throwing. Use this for non-critical paths where degraded behaviour is acceptable:

```typescript
@rateLimit({ key: 'suggestions', max: 20, softFail: true })
async getSuggestions(query: string) {
  return this.ai.suggest(query);  // returns null when throttled
}
```

---

## Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | **required** | Base key prefix. Supports `${n}` placeholders. |
| `max` | `number` | **required** | Maximum calls allowed in the window. |
| `windowSeconds` | `number` | `60` | Rolling window duration in seconds. |
| `keySource` | `RateLimitKeySource` | `'ip'` | Determines what constitutes a unique caller. |
| `keyParam` | `string` | `'0'` | Dot-path into args when `keySource === 'param'`. |
| `keyFn` | `(args, instance) => string` | — | Full key function when `keySource === 'custom'`. |
| `contextSource` | `'instance' \| 'params'` | `'instance'` | Where to find the Reactory context. |
| `softFail` | `boolean` | `false` | Return `null` instead of throwing on breach. |
| `errorMessage` | `string \| (remaining, resetIn) => string` | default message | Custom message or factory for breach errors. |

### `keySource` type

```typescript
type RateLimitKeySource =
  | 'static'   // always the same key (global limiter)
  | 'user'     // per authenticated user
  | 'ip'       // per client IP
  | 'param'    // per value from a method argument
  | 'custom';  // fully custom via keyFn
```

---

## Fail-open behaviour

| Scenario | Behaviour |
|----------|-----------|
| No context found | Logs a warning, executes method normally |
| `RateLimiterService` not registered | Logs a warning, executes method normally |
| Redis **and** DB both unavailable | `checkLimit` throws; decorator logs and executes normally |
| Redis down | Transparent fallback to PostgreSQL |

The decorator will **never prevent a call** due to an infrastructure failure.

---

## Recipes

### Brute-force login protection (per IP)

```typescript
@rateLimit({
  key: 'auth:login',
  max: 5,
  windowSeconds: 300,   // 5-minute lockout
  keySource: 'ip',
})
async login(username: string, password: string) { … }
```

### Per-user API quota

```typescript
@rateLimit({
  key: 'api:graphql',
  max: 1000,
  windowSeconds: 3600,  // 1000 req/hour per user
  keySource: 'user',
})
async executeQuery(query: string, variables: any, context: IReactoryContext) { … }
```

### Dynamic key from argument

Limit by the first argument value (e.g. upload destination bucket):

```typescript
@rateLimit({
  key: 'upload',
  max: 10,
  windowSeconds: 60,
  keySource: 'param',
  keyParam: '0.bucket',  // args[0].bucket
})
async uploadFile(options: { bucket: string }, file: Buffer) { … }
```

### Soft-fail for non-critical paths

```typescript
@rateLimit({ key: 'ai:suggest', max: 30, windowSeconds: 60, softFail: true })
async getSuggestions(query: string): Promise<Suggestion[] | null> {
  return this.ai.complete(query);
  // callers must handle null (throttled) and Suggestion[] (ok)
}
```

### Custom key function

```typescript
@rateLimit({
  key: 'sms:otp',
  max: 3,
  windowSeconds: 600,
  keySource: 'custom',
  keyFn: (args) => `sms:otp:phone:${args[0].phone}`,
})
async sendOtp(recipient: { phone: string }) { … }
```

### GraphQL resolver (context in params)

```typescript
class DocumentResolver {
  @rateLimit({
    key: 'doc:export',
    max: 5,
    windowSeconds: 60,
    keySource: 'user',
    contextSource: 'params',
  })
  async exportDocument(args: { id: string }, context: IReactoryContext) { … }
}
```

### Dynamic error messages

```typescript
@rateLimit({
  key: 'auth:login',
  max: 5,
  windowSeconds: 60,
  errorMessage: (_remaining, resetIn) =>
    `Too many login attempts. Try again in ${resetIn} seconds.`,
})
async login(username: string, password: string) { … }
```

---

## Error object shape

When `softFail` is `false` and the limit is breached, the thrown error carries GraphQL-compatible extensions:

```typescript
interface RateLimitError extends Error {
  extensions: {
    code: 'RATE_LIMIT_EXCEEDED';
    remaining: number;   // always 0 at breach
    resetIn: number;     // seconds until the window resets
  };
}
```

Apollo Server and most GraphQL frameworks surface `error.extensions` directly in the response, so clients can implement retry-after logic automatically.
