# Security CLI

The Security CLI manages JWT tokens for Reactory user accounts. It is registered under the `core.Security@1.0.0` component and is available via the Reactory CLI runner:

```bash
bin/cli.sh security <command> [options]
```

## Architecture

The CLI is a thin interactive layer over the **SecurityService** (`core.SecurityService@1.0.0`). All token operations are delegated to the service, which means the same logic is available from GraphQL resolvers and AI macro tools.

```
CLI  ──▶  SecurityService
              ├── MongoDB   (sessionInfo[] — source of truth for JWT validation)
              ├── Redis     (session-cache for fast token validation)
              └── PostgreSQL (durable session history via UserSession entity)
```

## Commands

### `create-token`

Create a new JWT token for a user.

```
security create-token -u <userId|email> [options]
```

| Flag | Alias | Description |
|------|-------|-------------|
| `-u` | `--user` | User identifier — MongoDB ObjectId or email address (**required**) |
| `-l` | `--long-lived` | Create a long-lived token (30 days) |
| `-s` | `--short-lived` | Create a short-lived token (15 minutes) |
| | `--expires-in <n>` | Custom expiry amount (integer) |
| | `--expires-unit <unit>` | Custom expiry unit: `minutes`, `hours`, `days`, `weeks` (requires `--expires-in`) |
| | `--issuer <iss>` | Override JWT issuer claim |
| | `--subject <sub>` | Override JWT subject claim |
| | `--audience <aud>` | Override JWT audience claim |

**Lifetime presets:**

| Preset | Duration | Flag |
|--------|----------|------|
| short | 15 minutes | `--short-lived` |
| standard | 24 hours | _(default)_ |
| long | 30 days | `--long-lived` |

**Examples:**

```bash
# Standard 24-hour token
bin/cli.sh security create-token -u alice@example.com

# Long-lived service token
bin/cli.sh security create-token -u alice@example.com --long-lived

# Custom 2-hour token with verbose payload output
bin/cli.sh security create-token -u 64abc123def456 --expires-in 2 --expires-unit hours -v
```

### `expire-tokens`

Expire (revoke) all active session tokens for one or more users. This clears the MongoDB `sessionInfo[]` array, invalidates the Redis session cache, and marks all matching rows in the PostgreSQL session history as `revoked`.

```
security expire-tokens -u <userId|email> | -p <regex>
```

| Flag | Alias | Description |
|------|-------|-------------|
| `-u` | `--user` | Expire tokens for a single user (id or email) |
| `-p` | `--pattern` | Expire tokens for all users whose email matches the regex |

**Examples:**

```bash
# Single user by email
bin/cli.sh security expire-tokens -u alice@example.com

# Single user by id
bin/cli.sh security expire-tokens -u 64abc123def456

# Bulk — all users in a domain
bin/cli.sh security expire-tokens --pattern "@example\.com$"
```

### `list-tokens`

List the active session tokens currently stored on a user's MongoDB document.

```
security list-tokens -u <userId|email>
```

| Flag | Alias | Description |
|------|-------|-------------|
| `-u` | `--user` | User whose tokens to list (**required**) |

**Examples:**

```bash
bin/cli.sh security list-tokens -u alice@example.com
bin/cli.sh security list-tokens -u 64abc123def456
```

## Global Options

| Flag | Alias | Description |
|------|-------|-------------|
| `-v` | `--verbose` | Enable verbose output (e.g. full JWT payload) |
| `-h` | `--help` | Show the built-in help text |

## Access Control

The CLI is restricted to users with the `SYSTEM` or `ADMIN` role.

## Related Components

| Component | ID | Description |
|-----------|----|-------------|
| SecurityService | `core.SecurityService@1.0.0` | Service layer — token CRUD, session validation, Redis caching, PG history |
| UserSession | `reactory_user_sessions` (PG) | TypeORM entity for durable session history |
| JWTStrategy | `src/authentication/strategies/JWTStrategy.ts` | Passport JWT strategy — uses `SecurityService.validateSession()` and `touchSession()` |
| RedisService | `core.RedisService@1.0.0` | Caching layer consumed by SecurityService |

## Data Flow

### Token Creation
1. CLI parses flags → calls `SecurityService.createToken()`
2. Service builds JWT payload, signs with `SECRET_SAUCE`
3. Session written to MongoDB `user.sessionInfo[]`
4. Redis session cache invalidated
5. Row inserted into PostgreSQL `reactory_user_sessions`

### Token Expiry
1. CLI parses flags → calls `SecurityService.expireTokens()`
2. MongoDB `user.sessionInfo[]` cleared (immediately blocks JWT validation)
3. Redis session cache invalidated
4. PostgreSQL rows updated: `status → 'revoked'`, `revokedAt`, `revokedBy`, `revocationReason`

### JWT Validation (runtime)
1. Passport extracts token → decodes payload
2. `User.findById()` — single DB read
3. `SecurityService.validateSession()` — Redis first, Mongo fallback (no writes)
4. `SecurityService.touchSession()` — fire-and-forget `lastLogin` update
