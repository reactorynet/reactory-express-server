# Error & Input Sanitization Guide

Compliance-focused redaction for `ApiError`, `ApiError.toString()`, and `InputValidator.sanitizeString()`. Built to satisfy **PCI-DSS 3.2.1**, **HIPAA Safe Harbor**, **GDPR Article 32**, and OAuth/OIDC token-handling best practices.

---

## What changed

The sanitizer no longer just replaces a key keyword with `[REDACTED]`. It now:

1. **Detects `key=value` / `key:value` / `"key":"value"`** patterns and masks the **value** using a strategy appropriate to the data type.
2. **Scans for compliance-sensitive value formats** (PAN, SSN, JWT, email) regardless of surrounding key.
3. **Preserves a small amount of context** (first/last char, last 4, BIN+last 4, domain TLD) so logs stay debuggable without exposing PII.
4. **Applies high-precedence scanners first** for `Bearer` / `Basic` auth tokens.

---

## Masking strategies

| Strategy        | Example input             | Example output           | Use case                           |
| --------------- | ------------------------- | ------------------------ | ---------------------------------- |
| `full`          | `myPassword123`           | `[REDACTED]`             | Passwords, secrets                 |
| `partial`       | `mySecretValue`           | `m***********e`          | Generic / unknown sensitive data   |
| `last4`         | `123456789`               | `*****6789`              | SSN, phone, generic tokens         |
| `first6last4`   | `4111111111111111`        | `411111******1111`       | PAN (PCI-DSS allowed format)       |
| `email`         | `john.doe@example.com`    | `j******e@*******.com`   | Email (preserves TLD)              |
| `hash`          | `patient-id-12345`        | `[HASH:1a2b3c4d]`        | HIPAA-friendly correlation id      |

---

## Environment variables

### `PII_REDACTION_GLOBS`
JSON array of patterns/rules for personal-identifiable info.

### `REDACTION_GLOBS`
JSON array of patterns/rules for general sensitive data.

### `SANITIZER_DISABLE`
Comma-separated list of built-in scanners to disable: `creditcard`, `ssn`, `jwt`, `email`.

### Two supported formats

**Legacy string format** (backward compatible — strategy auto-inferred from name):
```bash
export REDACTION_GLOBS='["password", "token", "ssn", "creditcard"]'
```

**Structured rule format** (recommended — explicit strategy):
```bash
export PII_REDACTION_GLOBS='[
  {"pattern": "patientId", "strategy": "hash"},
  {"pattern": "creditcard", "strategy": "first6last4"},
  {"pattern": "email", "strategy": "email"}
]'
```

### Strategy inference rules

When a pattern is provided as a plain string, the strategy is inferred:

| Pattern contains      | Inferred strategy |
| --------------------- | ----------------- |
| `email`               | `email`           |
| `credit`/`card`/`pan` | `first6last4`     |
| `ssn`/`phone`/`tax`   | `last4`           |
| `password`/`secret`   | `full`            |
| anything else         | `partial`         |

---

## Built-in defaults

These rules are always active unless explicitly disabled:

```typescript
[
  { pattern: 'password',      strategy: 'full' },
  { pattern: 'token',         strategy: 'last4' },
  { pattern: 'secret',        strategy: 'full' },
  { pattern: 'apiKey',        strategy: 'last4' },
  { pattern: 'authorization', strategy: 'last4' },
  { pattern: 'ssn',           strategy: 'last4' },
  { pattern: 'creditcard',    strategy: 'first6last4' },
  { pattern: 'email',         strategy: 'email' },
  { pattern: 'phone',         strategy: 'last4' },
]
```

Plus value-format scanners that run regardless of key:

* **Credit cards**: `\d{13,19}` with optional spaces/dashes → `first6last4`
* **SSN**: `NNN-NN-NNNN` → `last4`
* **JWT**: `eyJ...x.y.z` → `last4`
* **Email**: `user@domain.tld` → `email`
* **Bearer/Basic auth**: `Bearer abc...` / `Basic abc...` → `last4`

---

## Compliance scenarios

### PCI-DSS 3.2.1 (Requirement 3.4)

PAN must be unreadable in logs; only BIN (first 6) + last 4 may be displayed.

```typescript
const error = new ApiError('Charge declined for 4111111111111111');
error.toString();
// "Error: Charge declined for 411111******1111"
```

### HIPAA Safe Harbor

PHI such as SSN must be removed/masked.

```typescript
const error = new ApiError('Patient SSN: 123-45-6789 admitted');
error.toString();
// "Error: Patient SSN: *****6789 admitted"
```

For correlation across logs without exposing the identifier, use `hash`:
```bash
export PII_REDACTION_GLOBS='[{"pattern": "patientId", "strategy": "hash"}]'
```

### GDPR Article 32 (Pseudonymization)

```typescript
const error = new ApiError('Breach reported for user@example.com');
error.toString();
// "Error: Breach reported for u**r@*******.com"
```

### OAuth / OIDC tokens

```typescript
const error = new ApiError('Authorization: Bearer eyJhbG...JV_adQssw5c');
error.toString();
// "Error: Authorization: Bearer ******************w5c"
```

---

## API reference

### `ApiError.maskValue(value, strategy)`
Returns the masked representation of a single value.

### `ApiError.sanitizeToString(input, rules?, replacement?)`
Sanitizes a free-form string. `rules` may be `string[]` (legacy) or `RedactionRule[]`. Falls back to env-var configuration when no rules passed.

### `ApiError.getRedactionRules()`
Returns the merged, deduplicated rule set from env vars + defaults.

### `ApiError.getRedactionPatterns()`
Backwards-compatible: returns just the keys from `getRedactionRules()`.

### `error.toString()`
Automatically applies `sanitizeToString()` to the standard `Error.toString()` output.

### `InputValidator.sanitizeString(input)`
Removes script tags / `<` / `>` characters, then delegates to `ApiError.sanitizeToString()` for value masking.

---

## Types

```typescript
type RedactionStrategy =
  | 'full'         // [REDACTED]
  | 'partial'      // m***********e
  | 'last4'        // *********1234
  | 'first6last4'  // 411111******1234 (PCI-DSS PAN)
  | 'email'        // u**r@*******.com
  | 'hash';        // [HASH:1a2b3c4d]

interface RedactionRule {
  pattern: string;
  strategy?: RedactionStrategy;
}
```

---

## Production checklist

- [ ] Set `PII_REDACTION_GLOBS` for domain-specific PII (patient IDs, account numbers, etc.)
- [ ] Use structured rule format with explicit strategies for clarity
- [ ] Verify `error.toString()` is called on all error paths before logging or returning to clients
- [ ] Ensure `InputValidator.sanitizeString()` runs on all untrusted input that may be echoed back
- [ ] Confirm `SANITIZER_DISABLE` is empty in production unless explicitly needed
- [ ] Run penetration tests with sample PII to validate masking
- [ ] Configure log shipping/SIEM filters as a defence-in-depth layer
- [ ] Review for residual PII in stack traces (consider scrubbing them entirely in production)

---

## Testing

```bash
npx jest src/exceptions/__tests__/ErrorSanitization.test.ts
```

48 tests cover:
- All masking strategies (boundary cases, empty, short, long values)
- key=value, key:value, JSON, quoted values
- Compliance scanners (PAN, SSN, JWT, email, bearer, basic)
- Environment variable formats (string array + structured rules)
- Pattern deduplication
- Strategy inference
- Disabling individual scanners
- `toString()` integration
- Real-world compliance scenarios (PCI, HIPAA, GDPR, OAuth)
