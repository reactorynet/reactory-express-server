# `@audit` decorator

A TypeScript method decorator that writes structured audit entries to `ReactoryAuditService` **without any boilerplate code** inside the method body.

---

## Contents

- [Installation / import](#installation--import)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Timing modes](#timing-modes)
- [Value extractors](#value-extractors)
- [Template placeholders](#template-placeholders)
- [Options reference](#options-reference)
- [Fail-open behaviour](#fail-open-behaviour)
- [Recipes](#recipes)
  - [Access log (read-only)](#access-log-read-only)
  - [Before-and-after mutation](#before-and-after-mutation)
  - [Error capture](#error-capture)
  - [GraphQL resolver (context in params)](#graphql-resolver-context-in-params)
  - [Dynamic metadata](#dynamic-metadata)
- [What gets stored](#what-gets-stored)

---

## Installation / import

```typescript
import { audit } from '@reactory/server-core/application/decorators/audit';
// or via the barrel:
import { audit } from '@reactory/server-core/application/decorators';
```

`ReactoryAuditService` must be registered in the Reactory service container as `core.ReactoryAuditService@1.0.0`.

---

## Quick start

```typescript
import { audit } from '@reactory/server-core/application/decorators/audit';

class UserService {
  context: IReactoryContext;

  @audit({ action: 'user.login', eventType: 'access', resourceType: 'User' })
  async login(username: string, password: string) {
    // business logic unchanged
    return this.db.authenticate(username, password);
  }
}
```

One audit entry is written **after** `login` resolves (the default timing). No other code changes are required.

---

## How it works

```
caller
  │
  ▼
@audit wrapper
  │── [timing: 'before' or 'both'] ──► write before-entry (intent)
  │
  ├──► original method executes
  │
  │── [timing: 'after' or 'both'] ──► write after-entry (outcome, success/error)
  │
  └──► return result (or rethrow error)
```

The decorator:

1. Resolves the Reactory context (from `this.context` or scans method args).
2. Obtains `ReactoryAuditService` via `context.getService('core.ReactoryAuditService@1.0.0')`.
3. Writes a structured `IAuditLogParams` object with user, IP, session, organisation, and any extracted values.
4. Always returns the original method's result or rethrows its error — the audit path is fully transparent.

---

## Timing modes

| `timing` | Entries written | `success` flag | `result` available |
|----------|----------------|----------------|--------------------|
| `'after'` (default) | 1 — after execution | `true` / `false` | yes |
| `'before'` | 1 — before execution | `undefined` | no |
| `'both'` | 2 — before **and** after | before: `undefined`; after: `true`/`false` | after only |

Use `'before'` to record **intent** (e.g. "deletion was requested"), and `'both'` to track state transitions that need a before-snapshot and an after-snapshot for diff-based compliance reports.

```typescript
// Intent capture — useful for destructive operations
@audit({ action: 'document.delete', timing: 'before', resourceId: '0.id' })
async deleteDocument(id: string) { … }

// Full state transition
@audit({
  action: 'kyc.update',
  timing: 'both',
  before: '0',            // args[0] as before-state
  after: (_, r) => r,    // resolved result
})
async updateKyc(record: KycRecord) { … }
```

---

## Value extractors

`resourceId`, `before`, `after`, and `metadata` all accept a **value extractor**, which is one of:

### Dot-path string

Resolved against the **method arguments** array using zero-based indexing:

```
'0'        → args[0]
'0.id'     → args[0].id
'1.user.email' → args[1].user.email
```

### Extractor function

For full control, provide `(args, result, instance) => any`:

```typescript
resourceId: (args, result) => result?.id ?? args[0]?.id
before: (args) => args[0]
after: (_, result) => ({ id: result.id, status: result.status })
metadata: (args, result, instance) => ({ method: instance.constructor.name })
```

> In the **before phase**, `result` is always `undefined` because the method has not yet executed.

---

## Template placeholders

`action`, `source`, and `resourceType` support `${n}` / `${n.prop}` placeholders resolved from method args at call time:

```typescript
@audit({ action: 'file.${0.type}.upload', resourceType: '${0.type}' })
async uploadFile(file: { type: string; size: number }) { … }
// → action: 'file.pdf.upload', resourceType: 'pdf'
```

---

## Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `action` | `string` | **required** | Human-readable action name (supports placeholders). |
| `source` | `string` | class name | Module/service identifier in the log. |
| `eventType` | `'create' \| 'update' \| 'delete' \| 'access' \| 'approve' \| 'reject'` | — | CRUD/lifecycle classification. |
| `resourceType` | `string` | — | Type of resource (supports placeholders). |
| `resourceId` | `ValueExtractor` | — | Unique ID of the affected resource. |
| `before` | `ValueExtractor` | — | State snapshot before the operation. |
| `after` | `ValueExtractor` | — | State snapshot after the operation. |
| `metadata` | `Record<string,any> \| Function` | — | Extra key-value pairs attached to every entry. |
| `timing` | `'before' \| 'after' \| 'both'` | `'after'` | Controls when entries are written. |
| `actorType` | `'user' \| 'system' \| 'service' \| 'admin'` | inferred | Override actor classification. |
| `moduleName` | `string` | — | Module name forwarded to the audit record. |
| `moduleVersion` | `string` | — | Module version forwarded to the audit record. |
| `contextSource` | `'instance' \| 'params'` | `'instance'` | Where to find the Reactory context. |
| `failSilently` | `boolean` | `true` | Swallow audit errors instead of propagating them. |

### `contextSource` explained

| Value | Where context is found |
|-------|------------------------|
| `'instance'` (default) | `this.context` — typical for Reactory service classes |
| `'params'` | Scans method arguments for an object with `getService` — typical for GraphQL resolvers |

---

## Fail-open behaviour

The decorator is designed to **never break your service**.

| Scenario | Behaviour |
|----------|-----------|
| No context found | Logs a warning, executes method normally |
| `ReactoryAuditService` not registered | Logs a warning, executes method normally |
| Audit write fails (`failSilently: true`) | Logs an error, returns method result |
| Audit write fails (`failSilently: false`) | Throws the audit error instead of the method result |
| Original method throws | After-entry is written with `success: false` and `errorMessage`, then the original error is rethrown |

---

## Recipes

### Access log (read-only)

```typescript
@audit({
  action: 'user.profile.view',
  eventType: 'access',
  resourceType: 'User',
  resourceId: '0',   // args[0] = userId
})
async getUserProfile(userId: string) {
  return this.userRepo.findById(userId);
}
```

### Before-and-after mutation

```typescript
@audit({
  action: 'document.${0.id}.update',
  eventType: 'update',
  timing: 'both',
  resourceType: 'Document',
  resourceId: '0.id',
  before: '0',                      // snapshot of input document
  after: (_, result) => result,     // resolved return value
  metadata: { service: 'DocService', version: '2' },
})
async updateDocument(doc: Document): Promise<Document> {
  return this.docRepo.save(doc);
}
```

### Error capture

When a method throws, `timing: 'after'` (or `'both'`) automatically records:

```json
{
  "action": "payment.charge",
  "success": false,
  "errorMessage": "Card declined"
}
```

No extra code is needed.

### GraphQL resolver (context in params)

```typescript
class KycResolver {
  @audit({
    action: 'kyc.approve',
    eventType: 'approve',
    contextSource: 'params',      // context is a method argument
    resourceType: 'KYCRecord',
    resourceId: (args) => args[0]?.id,
  })
  async approveKyc(record: KycRecord, _: any, context: IReactoryContext) {
    return this.kycService.approve(record.id);
  }
}
```

### Dynamic metadata

```typescript
@audit({
  action: 'report.generate',
  metadata: (args, result, instance) => ({
    format: args[0].format,
    rowCount: result?.rows?.length,
    generatedBy: instance.constructor.name,
  }),
})
async generateReport(params: ReportParams) { … }
```

---

## What gets stored

Every audit entry is an `IAuditLogParams` object persisted by `ReactoryAuditService`:

| Field | Source |
|-------|--------|
| `action` | `options.action` (after template resolution) |
| `source` | `options.source` or decorated class name |
| `eventType` | `options.eventType` |
| `resourceType` | `options.resourceType` |
| `resourceId` | resolved from `options.resourceId` extractor |
| `before` | resolved from `options.before` extractor |
| `after` | resolved from `options.after` extractor |
| `metadata` | resolved from `options.metadata` |
| `user` / `actorId` | `context.user._id` |
| `actorType` | inferred from user or `options.actorType` |
| `ipAddress` | `context.req.ip` |
| `userAgent` | `context.req.headers['user-agent']` |
| `sessionId` | `context.sessionId` |
| `organizationId` | `context.partner._id` |
| `success` | `true` (no error) / `false` (threw) / `undefined` (before phase) |
| `errorMessage` | error message when method threw |
| `moduleName` | `options.moduleName` |
| `moduleVersion` | `options.moduleVersion` |
