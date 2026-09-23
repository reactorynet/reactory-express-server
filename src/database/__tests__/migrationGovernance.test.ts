/**
 * WP-B3: schema governance at startup.
 *
 * The unit block uses a stub DataSource. The integration block runs against a
 * real Postgres database named by REACTORY_TEST_POSTGRES_DB (created and
 * dropped by the CI migrations job); it is skipped when that is unset.
 */
import { DataSource } from 'typeorm';
import {
  MigrationsPendingError,
  prepareSchema,
  prepareSchemaOrExit,
  resolveSynchronize,
} from '../migrationGovernance';

describe('resolveSynchronize', () => {
  it.each([
    ['development', true],
    ['local', true],
    ['test', true],
    ['production', false],
    ['staging', false],
    ['', false],
  ])('NODE_ENV=%p -> %p', (nodeEnv, expected) => {
    expect(resolveSynchronize(undefined, nodeEnv as any)).toBe(expected);
  });

  it('lets the data source flag override NODE_ENV in both directions', () => {
    expect(resolveSynchronize('true', 'production')).toBe(true);
    expect(resolveSynchronize('false', 'development')).toBe(false);
  });
});

describe('prepareSchema (stub data source)', () => {
  const stub = (pendingNames: string[]) => {
    const ds: any = {
      options: { migrationsTableName: 'reactory_migrations_test' },
      synchronize: jest.fn(async () => undefined),
      runMigrations: jest.fn(async () => pendingNames.map((name) => ({ name }))),
    };
    return ds as DataSource;
  };
  const pendingOf = (names: string[]) => async (): Promise<string[]> => names;

  afterEach(() => jest.restoreAllMocks());

  it('synchronizes in development mode and never touches migrations', async () => {
    const ds = stub(['A']);
    const result = await prepareSchema(ds, { label: 'test', synchronize: true, log: () => undefined });
    expect(result.mode).toBe('synchronize');
    expect((ds as any).synchronize).toHaveBeenCalled();
    expect((ds as any).runMigrations).not.toHaveBeenCalled();
  });

  it('refuses with the pending migration names when not allowed to run them', async () => {
    const ds = stub(['CoreBaseline20260923120000']);
    await expect(prepareSchema(ds, { label: 'reactory-core Postgres', synchronize: false, runOnStart: false, log: () => undefined, getPending: pendingOf(['CoreBaseline20260923120000']) }))
      .rejects.toThrow(/reactory-core Postgres has 1 pending migration\(s\): CoreBaseline20260923120000/);
    expect((ds as any).synchronize).not.toHaveBeenCalled();
  });

  it('applies pending migrations when REACTORY_RUN_MIGRATIONS_ON_START is set', async () => {
    const ds = stub(['A', 'B']);
    const result = await prepareSchema(ds, { label: 'test', synchronize: false, runOnStart: true, log: () => undefined });
    expect(result).toEqual({ mode: 'migrate', applied: ['A', 'B'] });
    expect((ds as any).runMigrations).toHaveBeenCalledWith({ transaction: 'each' });
  });

  it('starts normally when nothing is pending', async () => {
    const ds = stub([]);
    await expect(prepareSchema(ds, { label: 'test', synchronize: false, runOnStart: false, log: () => undefined, getPending: pendingOf([]) }))
      .resolves.toEqual({ mode: 'verified', applied: [] });
  });

  it('prepareSchemaOrExit rethrows under NODE_ENV=test instead of exiting', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(((): never => undefined as never) as any);
    const ds = stub(['A']);
    await expect(prepareSchemaOrExit(ds, { label: 'test', synchronize: false, runOnStart: false, log: () => undefined, getPending: pendingOf(['A']) }))
      .rejects.toBeInstanceOf(MigrationsPendingError);
    expect(exit).not.toHaveBeenCalled();
  });
});

const TEST_DB = process.env.REACTORY_TEST_POSTGRES_DB;
const describeIfDb = TEST_DB ? describe : describe.skip;

describeIfDb('prepareSchema against a real empty database (production mode)', () => {
  jest.setTimeout(120000);

  const dataSourceFor = () => {
    const { CORE_ENTITIES, CORE_MIGRATIONS } = require('@reactory/server-modules/reactory-core/migrations/typeorm/schema');
    const env = process.env;
    return new DataSource({
      type: 'postgres',
      host: env.REACTORY_POSTGRES_HOST || env.POSTGRES_DB_HOST || 'localhost',
      port: parseInt(env.REACTORY_POSTGRES_PORT || env.POSTGRES_DB_PORT || '5432', 10),
      username: env.REACTORY_POSTGRES_USER || env.POSTGRES_USER || 'reactory',
      password: env.REACTORY_POSTGRES_PASSWORD || env.POSTGRES_PASSWORD || 'reactory',
      database: TEST_DB,
      synchronize: false,
      entities: CORE_ENTITIES,
      ...CORE_MIGRATIONS,
    });
  };

  it('refuses, then applies with the flag, then verifies', async () => {
    const ds = dataSourceFor();
    await ds.initialize();
    try {
      await expect(prepareSchema(ds, { label: 'core', synchronize: false, runOnStart: false, log: () => undefined }))
        .rejects.toThrow(/CoreBaseline20260923120000/);

      const applied = await prepareSchema(ds, { label: 'core', synchronize: false, runOnStart: true, log: () => undefined });
      expect(applied.applied).toContain('CoreBaseline20260923120000');

      await expect(prepareSchema(ds, { label: 'core', synchronize: false, runOnStart: false, log: () => undefined }))
        .resolves.toEqual({ mode: 'verified', applied: [] });
    } finally {
      await ds.destroy();
    }
  });
});
