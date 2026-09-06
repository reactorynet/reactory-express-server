# Reactory Environment Configuration & Resolution Guide

This document defines how environment configuration is structured, resolved, cascaded, and loaded across the Reactory platform.

---

## 1. Overview

Reactory uses dotenv files for configuration across local development, containerised builds (Docker/Podman), and production deployments (Bare-metal, VMs, Kubernetes).

Historically, utilities assumed that both a **Configuration ID** (default: `reactory`) and an **Environment ID** (default: `local`) were always present, attempting to load `config/<config-id>/.env.<env-id>`.

In modern deployments:
- **Production environments** typically supply a single `.env` file (e.g., mounted to `/reactory/reactory-express-server/.env` or placed in `config/<config-id>/.env`) **without an environment suffix**.
- **Development environments** often maintain a base `.env` alongside an environment-specific overlay like `.env.local` or `.env.development`.

To support both patterns seamlessly, Reactory uses a **two-stage cascading resolution**.

---

## 2. The Two-Stage Cascading Model

When any launcher or utility in `bin/` runs, it resolves configuration in two stages:

```
┌────────────────────────────────────────────────────────┐
│ Stage 1: Base Environment (.env)                      │
│ Checks:                                                │
│   1. config/<config-id>/.env                           │
│   2. ./.env (root)                                     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: Environment Override (.env.<environment>)     │
│ Checks (if environment ID provided or defaulted):      │
│   1. config/<config-id>/.env.<environment>             │
│   2. ./.env.<environment>                              │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Resolution & Merging                                   │
│ • Both exist: Merged into ./.env (override wins)       │
│ • Override only: Copied to ./.env                      │
│ • Base only (Production): Used directly without error  │
└────────────────────────────────────────────────────────┘
```

### Key Rules
1. **Base First**: Default settings, common ports, application keys, and non-sensitive fallbacks are defined in the base `.env`.
2. **Override Precedence**: If `.env.<environment>` exists (e.g., `.env.local`), any key present in both files takes the value from the override file.
3. **No False Failures in Production**: In production, where no environment ID is passed and `.env.local` does not exist, the scripts **gracefully fall back** to the base `.env`. The absence of `.env.local` is **not** an error.

---

## 3. Shared Helpers (`bin/shared/shell-utils.sh`)

The resolution logic is centralized in `bin/shared/shell-utils.sh`:

### `resolve_env_files [client_key] [target_env]`
Locates the base environment file (`BASE_ENV_FILE`) and the optional override file (`OVERRIDE_ENV_FILE`). Fails only if **neither** file exists.

### `copy_env_file [client_key] [target_env]`
Prepares the active `./.env` file in the project root:
- Merges base + override when both exist.
- Copies the available file if only one exists.
- Leaves `./.env` untouched if it is already the active base and no overrides exist.

### `source_env_file [client_key] [target_env]`
Exports the variables into the calling shell.
> **Safety Note:** Standard bash `source` can fail or execute unwanted commands if values contain shell metacharacters (e.g. unquoted passwords with `&`, `<`, `>`, `^`). `source_env_file` parses dotenv key-value pairs cleanly, safely strips surrounding quotes, and exports them directly into the environment.

### `get_env_file_path [client_key] [target_env]`
Returns the canonical path to the active environment file, checking for overrides first and falling back to base `.env`.

---

## 4. Usage Across Environments

### Local Development
In local development, you typically run:
```bash
bin/start.sh
```
This resolves `config/reactory/.env` (base) and `config/reactory/.env.local` (override), merges them into `./.env`, and starts nodemon with `env-cmd -f ./.env`.

To target a specific tenant or environment:
```bash
bin/start.sh myclient staging
```

### Production Deployment
In production, your deployment pipeline (Kubernetes Secret, Podman volume mount, or CI/CD deploy hook) provides a single `.env` file:
```bash
# Deployed container or server directory:
/reactory/reactory-express-server/.env
```
When running commands without parameters:
```bash
bin/start.sh --no-nodemon
bin/reactory workflow execute --id=MyWorkflow
bin/migrate.sh up
```
The scripts automatically detect `./.env`, verify that `.env.local` does not exist, and run directly against `./.env` without warning or error.

---

## 5. Script Integration Reference

Every script in `bin/` conforms to this pattern:

| Script | How Environment is Loaded |
|--------|---------------------------|
| `bin/start.sh` | `copy_env_file`, `source_env_file`, then `env-cmd -f ./.env` |
| `bin/start-otel.sh` | `copy_env_file`, `source_env_file`, then `env-cmd -f ./.env` |
| `bin/debug.sh` | `copy_env_file`, `source_env_file`, then `env-cmd -f ./.env` |
| `bin/generate.sh` | `copy_env_file`, `source_env_file`, then `env-cmd -f ./.env` |
| `bin/run.sh` | Dynamically resolves `app/index.js`; supports `--bun` and `--bun-version=VERSION` |
| `bin/run-otel.sh` | Continuous restart loop; preloads OTLP; supports `--bun` and `--bun-version=VERSION` |
| `bin/serve.sh` | `copy_env_file`, `source_env_file`, then `env-cmd -f ./.env` with PM2 |
| `bin/bun.sh` | Dedicated Bun runner; resolves `app/index.js`; supports `--bun-version=VERSION` |
| `bin/reactory` | Resolves base + override, merges to root `./.env`, then passes to `env-cmd` |
| `bin/migrate.sh` | `copy_env_file`, sets `ENV_FILE="./.env"`, invokes `migrate-mongo` via `env-cmd` |
| `bin/migrate-typeorm.sh` | `copy_env_file`, sets `ENV_FILE="./.env"`, invokes TypeORM via `env-cmd` |
| `bin/backup.sh` | `source_env_file` (safe export of DB credentials) |
| `bin/restore.sh` | `source_env_file` (safe export of DB credentials) |
| `bin/compose.sh` | `copy_env_file`, `source_env_file`, passes `--env-file ./.env` |
| `bin/docker-compose.sh` | `copy_env_file`, `source_env_file`, passes `--env-file ./.env` |
| `bin/podman-compose.sh` | `copy_env_file`, `source_env_file`, passes `--env-file ./.env` |
| `bin/build.sh` | `copy_env_file`, `source_env_file`, packages resolved `.env` into build tar |
| `bin/depends.sh` | Checks for `.env.<env>`, falls back to base `.env` or `./.env` |
| `bin/terraform.sh` | Sources base `.env` first if present, then environment override if present |
