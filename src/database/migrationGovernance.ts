/**
 * Schema governance for TypeORM data sources (WP-B3).
 *
 * TypeORM's `synchronize` diffs the entities against the live database and
 * applies the difference on boot: it can drop or rewrite columns, with no
 * review and no record of what changed. That is acceptable on a developer's
 * machine and unacceptable against Aurora with production data.
 *
 *   development / local / test  -> pending migrations, then synchronize
 *   anything else               -> migrations only:
 *     REACTORY_RUN_MIGRATIONS_ON_START=true  apply pending migrations, start
 *     otherwise                              refuse to start while any
 *                                            migration is pending
 *
 * A data source's own `<PREFIX>_POSTGRES_SYNCHRONIZE=true|false` still wins,
 * so a shared test database can opt out, or a disposable environment opt in.
 *
 * Every data source that goes through here must list its migrations and
 * migrations table (see each module's `migrations/typeorm/schema.ts`), so the
 * runtime and `bin/migrate-typeorm.sh` agree on what "pending" means.
 */

import { DataSource, MigrationExecutor } from 'typeorm';
import logger from '@reactory/server-core/logging';

export const SYNCHRONIZE_ENVIRONMENTS = ['development', 'local', 'test'];

export type SchemaMode = 'synchronize' | 'migrate' | 'verified';

export interface PrepareSchemaResult {
  mode: SchemaMode;
  /** Migrations applied during this call (mode `migrate`). */
  applied: string[];
}

export class MigrationsPendingError extends Error {
  constructor(public readonly label: string, public readonly pending: string[], public readonly table?: string) {
    super(
      `STARTUP ERROR: ${label} has ${pending.length} pending migration(s): ${pending.join(', ')}. ` +
      `Run bin/migrate-typeorm.sh up, or set REACTORY_RUN_MIGRATIONS_ON_START=true to apply them at boot.`,
    );
    this.name = 'MigrationsPendingError';
  }
}

/**
 * Whether a data source may synchronize its schema.
 *
 * @param flag     the data source's `<PREFIX>_POSTGRES_SYNCHRONIZE` value
 * @param nodeEnv  NODE_ENV
 */
export const resolveSynchronize = (flag: string | undefined, nodeEnv: string | undefined = process.env.NODE_ENV): boolean => {
  if (flag !== undefined && flag !== '') return flag === 'true';
  return SYNCHRONIZE_ENVIRONMENTS.includes((nodeEnv || '').toLowerCase());
};

/** Names of migrations the data source knows about but has not applied. */
export const pendingMigrations = async (dataSource: DataSource): Promise<string[]> => {
  const executor = new MigrationExecutor(dataSource);
  const pending = await executor.getPendingMigrations();
  return pending.map((migration) => migration.name);
};

export interface PrepareSchemaOptions {
  /** Human-readable data source name for logs and errors. */
  label: string;
  synchronize: boolean;
  runOnStart?: boolean;
  log?: (message: string) => void;
  /** Pending-migration lookup; defaults to TypeORM's MigrationExecutor. */
  getPending?: (dataSource: DataSource) => Promise<string[]>;
}

/**
 * Bring an initialized data source's schema to the expected state, or refuse.
 * Throws MigrationsPendingError when migrations are pending and may not run.
 */
export const prepareSchema = async (dataSource: DataSource, options: PrepareSchemaOptions): Promise<PrepareSchemaResult> => {
  const {
    label,
    synchronize,
    runOnStart = process.env.REACTORY_RUN_MIGRATIONS_ON_START === 'true',
    log = (message: string) => logger.info(message),
    getPending = pendingMigrations,
  } = options;

  if (synchronize) {
    // Migrations first, then synchronize: a migration may backfill data that a
    // synchronized constraint needs (for example client_key before NOT NULL),
    // and the baselines are idempotent, so this is safe on a database that
    // synchronize built.
    const applied = (await dataSource.runMigrations({ transaction: 'each' })).map((m) => m.name);
    await dataSource.synchronize();
    log(`${label}: ${applied.length} migration(s) applied, schema synchronized (development mode)`);
    return { mode: 'synchronize', applied };
  }

  if (runOnStart) {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    const names = applied.map((migration) => migration.name);
    log(`${label}: ${names.length} migration(s) applied${names.length ? `: ${names.join(', ')}` : ''}`);
    return { mode: 'migrate', applied: names };
  }

  const pending = await getPending(dataSource);
  if (pending.length > 0) {
    throw new MigrationsPendingError(label, pending, dataSource.options.migrationsTableName);
  }
  log(`${label}: schema verified, no pending migrations`);
  return { mode: 'verified', applied: [] };
};

/**
 * Model `onStartup` errors are caught and logged by the model registry, so a
 * refusal must end the process itself. Under test, or when Electron owns the
 * process, it is rethrown instead.
 */
export const failStartup = (error: unknown): never => {
  if (process.env.NODE_ENV === 'test' || process.env.REACTORY_RUNTIME === 'electron') {
    throw error;
  }
  logger.error((error as Error)?.message || String(error), error);
  process.exit(1);
};

/**
 * prepareSchema, ending the process when migrations are pending.
 */
export const prepareSchemaOrExit = async (dataSource: DataSource, options: PrepareSchemaOptions): Promise<PrepareSchemaResult> => {
  try {
    return await prepareSchema(dataSource, options);
  } catch (error) {
    if (error instanceof MigrationsPendingError) failStartup(error);
    throw error;
  }
};
