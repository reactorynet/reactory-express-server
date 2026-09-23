# Reactory Migration Guide

This guide documents the migration tooling in this repository and how to run migrations safely across a module-driven architecture.

The Reactory server loads models from active modules, so migrations are also module-aware.

## Overview

Reactory supports two migration tracks:

1. MongoDB / Mongoose migrations (via `migrate-mongo`)
2. PostgreSQL / TypeORM migrations (via TypeORM CLI)

Both are orchestrated by scripts in this folder:

- `bin/migrate.sh` for MongoDB
- `bin/migrate-typeorm.sh` for TypeORM

## Why Module-Aware Migrations

Models are supplied by modules under `src/modules/<module-key>`. Running one global migration stream would blur module ownership and create rollback risk.

Instead, each module owns its own migration folders:

- Mongo: `src/modules/<module-key>/migrations/mongo`
- TypeORM: `src/modules/<module-key>/migrations/typeorm`

Active modules are derived from:

- `src/modules/enabled-<client_key>.json`

This keeps migration scope aligned with what the server actually loads for a given client config.

## Directory Layout

### Module-Level

Every migration is module-scoped; there is no server-level (root) target.
Each module owns its own migration directories.

Example:

```text
src/modules/reactory-core/
  migrations/
    mongo/
      20260516013514-baseline-reactory-clients.js
    typeorm/
      schema.ts          # entities + migrations table, shared with the runtime DataSource
      data-source.ts     # CLI DataSource used by bin/migrate-typeorm.sh
      20260923120000-CoreBaseline.ts
```

## Environment Resolution

Both migration runners support:

```text
<command> [client_key] [target_env]
```

Defaults:

- `client_key = reactory`
- `target_env = local`

The env file resolution uses a two-stage cascade via `copy_env_file()`:

1. **Base configuration**: `config/<client_key>/.env` or root `./.env`
2. **Environment override**: `config/<client_key>/.env.<target_env>` or root `./.env.<target_env>` (if present)

If both exist, they are merged into `./.env` where override variables take precedence. In production environments where only a single `.env` exists (and no environment name is provided), the runner automatically uses the base `.env` directly without failing on a missing `.env.local`.

The scripts use `env-cmd -f ./.env` to load dotenv files safely into child migration processes without shell metacharacter issues.

## Mongo Migrations

### Script

- `bin/migrate.sh`

### Commands

- `status` - Show pending/applied migrations
- `up` - Apply pending migrations
- `down` - Revert last migration
- `create` - Create a migration file

Optional validation flag:

- `--validate` - after `up`, run `status` per target and fail if any `PENDING` rows remain

### Safety Rules

- `down` requires `--module=<module-key>`
- `create` requires `--module=<module-key>`
- `create` also requires:
  - `--desc=<description>`

### Mongo Changelog Collections

- Module migrations: `reactory_migrations_<module-key>`

### Mongo Examples

Run status for everything active:

```bash
bin/migrate.sh status
```

Run status for a specific client/env:

```bash
bin/migrate.sh status reactory local
```

Apply all pending active module migrations:

```bash
bin/migrate.sh up reactory local
```

Apply and validate that all targeted migrations are fully applied:

```bash
bin/migrate.sh up reactory local --validate
```

Revert one migration for a specific module:

```bash
bin/migrate.sh down reactory local --module=reactory-core
```

Create a module migration:

```bash
bin/migrate.sh create reactory local --module=reactory-core --desc="add-feature-flags-default"
```

## TypeORM Migrations

### Script

- `bin/migrate-typeorm.sh`

### Commands

- `status` - Show migration status
- `up` - Run pending migrations
- `down` - Revert last migration
- `create` - Create a migration file

### Safety Rules

- `down` requires `--module=<module-key>`
- `create` requires:
  - `--module=<module-key>`
  - `--name=<migration-name>`

### Startup Governance

`src/database/migrationGovernance.ts` decides what each Postgres DataSource
(reactory-core, reactory-reactor, reactory-classroom) does at boot:

| Environment | Behaviour |
|---|---|
| `NODE_ENV` development / local / test | `synchronize()` as before |
| anything else | migrations only |
| ... with `REACTORY_RUN_MIGRATIONS_ON_START=true` | apply pending migrations, then start |
| ... without it | refuse to start (exit 1) and list the pending migrations |

`<PREFIX>_POSTGRES_SYNCHRONIZE=true|false` (`REACTORY_`, `REACTOR_`,
`CLASSROOM_`) overrides the environment default for one DataSource.

The runtime DataSource and the CLI DataSource read the same
`migrations/typeorm/schema.ts`, so "pending" means the same thing to both.

### Baselines

`20260923120000-*Baseline.ts` in each module were generated from the entities
and made idempotent (`IF NOT EXISTS`, guarded enum types, constraints and index
renames). Every existing database was built by `synchronize`; running the
baselines against one changes nothing except recording them. Against an empty
database they create the full schema.

Indexes TypeORM cannot express (trigram, partial JSONB, GIN `jsonb_path_ops`)
are declared on the entity with `@Index(name, cols, { synchronize: false })` and
created by migrations, so neither `synchronize` nor `migration:generate` drops
them.

### Drift Check

CI (`migrations` job) runs every module's migrations against an empty Postgres
and then `migration:generate --check`, which fails when an entity changed
without a migration. Locally:

```bash
scripts/ci/check-migrations.sh
```

### TypeORM Module Requirements

For a module to participate in TypeORM migrations, it must define:

- `src/modules/<module-key>/migrations/typeorm/schema.ts` (entities + migration options)
- `src/modules/<module-key>/migrations/typeorm/data-source.ts`

That data source should:

1. Set `synchronize: false`
2. Set `migrationsRun: false`
3. Point migrations to timestamped files only (avoid matching `data-source.ts`)
4. Use a dedicated migration table name per module

Example migration glob:

```ts
migrations: [__dirname + "/[0-9]*-*.ts", __dirname + "/[0-9]*-*.js"]
```

### TypeORM Examples

Show status across active modules with TypeORM migration data sources:

```bash
bin/migrate-typeorm.sh status
```

Show status for one module:

```bash
bin/migrate-typeorm.sh status --module=reactory-core
```

Run module migrations:

```bash
bin/migrate-typeorm.sh up --module=reactory-core
```

Revert one module migration:

```bash
bin/migrate-typeorm.sh down --module=reactory-core
```

Create a new TypeORM migration file for a module:

```bash
bin/migrate-typeorm.sh create --module=reactory-core --name=AddAuditPartitioning
```

## Active Module Resolution

Module execution is based on `enabled-<client_key>.json` in `src/modules`.

The helper in `bin/shared/shell-utils.sh` resolves active module keys:

- `get_active_module_keys <client_key> [modules_dir]`

The migration scripts use this list to decide which module folders to execute.

## Current Baseline

### Mongo

- Root baseline in `migrations/20260516000000-initial.js`
- Reactory-core module baseline in:
  - `src/modules/reactory-core/migrations/mongo/20260516013514-baseline-reactory-clients.js`

### TypeORM

- Reactory-core migration data source:
  - `src/modules/reactory-core/migrations/typeorm/data-source.ts`
- Reactory-core baseline migration:
  - `src/modules/reactory-core/migrations/typeorm/20260516021500-CreateReactoryAuditTable.ts`

## Authoring Guidelines

### Mongo Migration Guidelines

1. Prefer additive, idempotent operations where possible.
2. Guard backfills with `$exists` checks.
3. Keep `down` safe; avoid destructive data removal unless intentional.
4. Use module-owned collections from that module domain.

### TypeORM Migration Guidelines

1. Keep schema changes explicit in migration SQL or query builder operations.
2. Do not rely on `synchronize: true` for production schema evolution.
3. Use deterministic index names.
4. Ensure migration names are descriptive and stable.

## Operational Workflow

Recommended flow for each change:

1. Implement model changes in module code.
2. Create migration in the same module migration folder.
3. Run `status` to verify pending state.
4. Run `up` in local/dev.
5. Validate service startup and module behavior.
6. Commit model + migration together.

## Troubleshooting

### Mongo: `unknown option '--config'`

Use `-f` for migrate-mongo config files. The script already does this.

### Mongo: env parse issues with `source`

Do not source dotenv files directly. Use `env-cmd` as implemented.

### TypeORM: stack overflow during migration discovery

Ensure migration glob excludes `data-source.ts` and only matches timestamped files.

### TypeORM: module not appearing in `status`

Check that this file exists for the module:

- `src/modules/<module-key>/migrations/typeorm/data-source.ts`

### Missing active module migrations

Confirm module is listed in:

- `src/modules/enabled-<client_key>.json`

## Quick Reference

Mongo status all:

```bash
bin/migrate.sh status
```

Mongo up all:

```bash
bin/migrate.sh up
```

Mongo down one module:

```bash
bin/migrate.sh down --module=reactory-core
```

TypeORM status all participating modules:

```bash
bin/migrate-typeorm.sh status
```

TypeORM up one module:

```bash
bin/migrate-typeorm.sh up --module=reactory-core
```

TypeORM create one module migration:

```bash
bin/migrate-typeorm.sh create --module=reactory-core --name=YourMigrationName
```
