# Reactory Server Utilities

The server has several utilities that make managing your Reactory instance and deployments easier.
These utils are generally shortcut wrappers for more complex node command instructions.

## Environment Variables

All scripts rely on these environment variables being set:

- `REACTORY_HOME` — root project directory
- `REACTORY_DATA` — data/CDN directory
- `REACTORY_SERVER` — server source directory
- `REACTORY_CLIENT` — PWA client directory
- `REACTORY_PLUGINS` — plugins directory

Most scripts also accept positional arguments for **client key** (config directory under `config/`, default: `reactory`) and **environment** (env file suffix, default: `local`).

---

## Development & Running

| Script | Purpose | Usage |
|--------|---------|-------|
| [start.sh](./start.sh) | Local dev server with auto-restart via nodemon | `bin/start.sh [client] [env] [--no-nodemon]` |
| [debug.sh](./debug.sh) | Local dev server with Node inspector for remote debugging | `bin/debug.sh [client] [env]` |
| [run.sh](./run.sh) | Run the compiled version of the application | `bin/run.sh [client] [env]` |
| [serve.sh](./serve.sh) | Production deployment via pm2 (auto-detects podman/docker) | `bin/serve.sh [client] [env] [pm2-env]` |
| [bun.sh](./bun.sh) | Run the dev server using the Bun runtime | `bin/bun.sh [client] [env]` |
| [start-otel.sh](./start-otel.sh) | Dev server with OpenTelemetry instrumentation | `bin/start-otel.sh [client] [env] [no-nodemon]` |
| [run-otel.sh](./run-otel.sh) | Run compiled app with OTLP telemetry collector | `bin/run-otel.sh [client] [env]` |

### Development mode

When the server runs in development mode it watches for file changes (`.js`, `.ts`, `.tsx`, `.graphql`). On every save the server restarts automatically.

```bash
bin/start.sh                  # all defaults: client=reactory, env=local
bin/start.sh myapp production # custom config + environment
bin/start.sh --no-nodemon     # run once without auto-restart
```

### Production mode (pm2)

```bash
bin/serve.sh reactory local development
# starts pm2 with the pm2.<env>.config.js and opens pm2 monit
```

---

## Building & Deploying

| Script | Purpose | Usage |
|--------|---------|-------|
| [build.sh](./build.sh) | Compile server application, produce deployment tar, read version from package.json | `bin/build.sh [client] [env]` |
| [build-clean.sh](./build-clean.sh) | Clean build helper that prevents git repos from being copied during builds | Run before build steps |
| [build-image.sh](./build-image.sh) | Build a container image (auto-detects podman → docker) | `bin/build-image.sh [client] [env] [Dockerfile]` |
| [bic.sh](./bic.sh) | **Full deployment pipeline**: build → image → compose (3 steps in one command) | `bin/bic.sh [config-id] [env-id] [compose-variant]` |
| [bit.sh](./bit.sh) | **Infra deploy pipeline**: build → image → PWA build → terraform apply (4 steps) | `bin/bit.sh [config-id] [env-id]` |
| [install.sh](./install.sh) | Full platform installer — configures server, data/CDN, and PWA client. Safe to curl-pipe. | `bash bin/install.sh` or `curl … \| bash` |
| [install-modules.sh](./install-modules.sh) | Install individual Reactory modules | `bin/install-modules.sh --module reactory-core` |

### Quick deploy the most common path

```bash
# Full local deployment in one command: build server, image it, start containers
bin/bic.sh            # defaults: config=reactory  env=local
bin/bic.sh myapp dev develop   # custom + compose variant
```

---

## Container Services

| Script | Purpose | Usage |
|--------|---------|-------|
| [compose.sh](./compose.sh) | Unified container launcher (replaces docker-compose.sh and podman-compose.sh). Auto-selects podman-compose → docker compose v2 → docker-compose v1. | `bin/compose.sh [config-id] [env-id] [variant] [command]` |
| [docker-compose.sh](./docker-compose.sh) | Legacy compose wrapper (superseded by compose.sh) | `bin/docker-compose.sh [client] [env] [command]` |
| [podman-compose.sh](./podman-compose.sh) | Legacy compose wrapper (superseded by compose.sh) | `bin/podman-compose.sh [config-id] [env-id]` |

### compose.sh usage

```bash
# Start all services (default: docker-compose.yaml, podman-compose or docker compose)
bin/compose.sh

# Use a variant compose file
bin/compose.sh reactory local develop    # → docker-compose-develop.yaml

# Pass commands to the compose runtime
bin/compose.sh reactory local down       # stop services
bin/compose.sh reactory local logs -f    # stream logs
```

---

## Database — Backup & Restore

| Script | Purpose | Usage |
|--------|---------|-------|
| [backup.sh](./backup.sh) | Comprehensive backup (MongoDB + PostgreSQL). Supports partial backups and dry-run. | `bin/backup.sh [client] [env] [options]` |
| [restore.sh](./restore.sh) | Comprehensive restore from `.tar.gz` archive or extracted directory. Supports namespace remapping, drop-and-restore, and partial restores. | `bin/restore.sh <archive> [client] [env] [options]` |

### backup.sh options

```bash
bin/backup.sh                          # full (MongoDB + PostgreSQL)
bin/backup.sh reactory local --mongo-only      # MongoDB only
bin/backup.sh reactory local --postgres-only   # PostgreSQL only
bin/backup.sh reactory local --output-dir /tmp/backups
bin/backup.sh reactory local --no-bundle              # leave as directory, no .tar.gz
bin/backup.sh reactory local --dry-run                # preview only
```

### restore.sh options

```bash
bin/restore.sh /path/to/backup.tar.gz           # full restore
bin/restore.sh /path/to/dir  reactory local --mongo-only
bin/restore.sh backup.tar.gz --drop              # drop existing data first
bin/restore.sh backup.tar.gz --pg-target-db newdb   # restore PG to a different DB
```

### Legacy: MongoDB only (superseded by restore.sh)

| Script | Purpose | Usage |
|--------|---------|-------|
| [restore2.sh](./restore2.sh) | Simple MongoDB-only restore via mongorestore (8-line script). Use `restore.sh` for new work. | `bin/restore2.sh <dbFrom> <dbTo> <filename>` |

---

## Migration Tooling

### MongoDB Migrations

| Script | Purpose | Usage |
|--------|---------|-------|
| [migrate.sh](./migrate.sh) | Module-aware MongoDB migration runner (status/up/down/create). | See [migrate.md](./migrate.md) |

```bash
bin/migrate.sh status                              # show pending/applied
bin/migrate.sh up reactory local                    # apply all pending
bin/migrate.sh down reactory local --module=core    # roll back module migration
bin/migrate.sh create reactory local --server --desc="add-index"
```

### PostgreSQL / TypeORM Migrations

| Script | Purpose | Usage |
|--------|---------|-------|
| [migrate-typeorm.sh](./migrate-typeorm.sh) | PostgreSQL/TypeORM migration helper | `bin/migrate-typeorm.sh <command> [client] [env]` |

---

## Developer Utilities

### Configuration & Workspace

| Script | Purpose | Usage |
|--------|---------|-------|
| [addconfig.sh](./addconfig.sh) | Interactive guide to create a config file under `config/` | `bin/addconfig.sh [config-name] [config-env]` |
| [create-workspace.sh](./create-workspace.sh) | Generate a VS Code `.code-workspace` file | `bin/create-workspace.sh [config] [--out /path/file.code-workspace]` |

### Testing

| Script | Purpose | Usage |
|--------|---------|-------|
| [jest.sh](./jest.sh) | Launch the Jest test suite with env loading and auto-installed deps | `bin/jest.sh [client] [env] [file-pattern] [--testNamePattern=PATTERN]` |
| [mocha.sh](./mocha.sh) | Launch the Mocha test suite | `bin/mocha.sh [client] [env] [file-pattern]` |

### Search & Testing Infrastructure

| Script | Purpose | Usage |
|--------|---------|-------|
| [meilisearch.sh](./meilisearch.sh) | Launch a MeiliSearch instance | `bin/meilisearch.sh <master-key>` |
| [selenium.sh](./selenium.sh) | Start Selenium standalone server | `bin/selenium.sh [client] [env]` |

### Code Generation & Dependency Management

| Script | Purpose | Usage |
|--------|---------|-------|
| [generate.sh](./generate.sh) | Run code generation from YAML definitions | `bin/generate.sh [client] [env]` |
| [depends.sh](./depends.sh) | Manage dependencies with watch/config/env flags | `bin/depends.sh --watch --cname=myapp --cenv=prod` |
| [cli.sh](./cli.sh) | Watch-mode dependency checker with environment validation | `bin/cli.sh --watch --cname=myapp --debug` |

### Infrastructure & Git

| Script | Purpose | Usage |
|--------|---------|-------|
| [terraform.sh](./terraform.sh) | Execute Terraform for infrastructure (K8/minikube). Supports log-level, dry-run, skip hooks. | `bin/terraform.sh <cmd> --reactory-config=key --reactory-env=env` |
| [git-manager.sh](./git-manager.sh) | Multi-repo git management utility across the Reactory workspace | `bin/git-manager.sh <command>` |

### Unified CLI

| Script | Purpose | Usage |
|--------|---------|-------|
| [reactory](./reactory) | Unified CLI executable providing commands like `service-gen`, `generate`, etc. | `bin/reactory <command> [options]` — see [REACTORY_EXECUTABLE_USAGE.md](./REACTORY_EXECUTABLE_USAGE.md) |

---

## Other Files

### Build rsync configs (used by build.sh)

| File | Purpose |
|------|---------|
| [build.app.rsync](./build.app.rsync) | Include/exclude rules for app assets |
| [build.bin.rsync](./build.bin.rsync) | Which scripts to bundle into the deployment tar |
| [build.data.rsync](./build.data.rsync) | Data directory rsync rules |
| [build.lib.rsync](./build.lib.rsync) | Library include/exclude |
| [build.modules.rsync](./build.modules.rsync) | Module inclusion patterns |
| [build.exclude.rsync](./build.exclude.rsync) | Git exclusion rules for builds |

### Documentation (in this folder)

| File | Content |
|------|---------|
| [compose.md](./compose.md) | Detailed compose.sh documentation |
| [migrate.md](./migrate.md) | Detailed migration tooling guide |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Implementation summary notes |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Quick reference for developers |
| [REACTORY_EXECUTABLE_USAGE.md](./REACTORY_EXECUTABLE_USAGE.md) | Full `reactory` CLI usage guide |

---

## Deprecated / Placeholder

| Script | Status |
|--------|--------|
| `reactory.update.sh` | **Placeholder** (0 bytes). Was intended to pull latest, install deps, and restart the server. Not implemented. |
| [docker-compose.sh](./docker-compose.sh) | Superseded by [compose.sh](./compose.sh) — use compose.sh instead. |
| [podman-compose.sh](./podman-compose.sh) | Superseded by [compose.sh](./compose.sh) — use compose.sh instead. |
| [restore2.sh](./restore2.sh) | Superseded by [restore.sh](./restore.sh) — use restore.sh for new work. |
| `build.data.rsync_inc.template` | Empty placeholder (0 bytes). |

---

## Shared Dependencies

All scripts source utilities from:

```bash
source ./bin/shared/shell-utils.sh
```

This provides helper functions like `check_env_vars`, `check_node`, `check_meili_search`, `has_command`, etc.
