/**
 * Contract between the client-config connection registry and the data macros.
 *
 * REACTORY-302016408/20261103/3664951717 had two halves:
 *
 *  1. The registry declared `reactory.mongodb.connection` with
 *     `variant: "mongodb"`, but the `mongo` macro compared strictly against
 *     `'mongo'`. The sanctioned tool rejected the sanctioned connection.
 *  2. The registry's default database was `reactory` while the server ran
 *     against `reactory-reactory`, so anyone inspecting templates through the
 *     setting saw an empty database.
 *
 * These tests pin both at the registry level, which is where the drift lives:
 * renaming a variant on either side, or dropping the database derivation, fails
 * here rather than silently disabling a tool for every agent.
 */
import {
  mongoConnectionSettings,
  postgresConnectionSettings,
} from '@reactory/server-core/database/connectionOptions';
import { normaliseDatabaseVariant } from '@reactory/server-modules/reactory-reactor/ai/macro/data/variants';
import { MongoReadMacroRegistry } from '@reactory/server-modules/reactory-reactor/ai/macro/data/mongo/macro';
import { PostgresMacroRegistry } from '@reactory/server-modules/reactory-reactor/ai/macro/data/pgsql/macro';

/** Every variable that can influence these two settings. */
const MANAGED_VARS = [
  'MONGOOSE',
  'MONGO_DB',
  'MONGO_HOST',
  'MONGO_PORT',
  'MONGO_USER',
  'MONGO_PASSWORD',
  'REACTORY_MONGO_DB',
  'REACTORY_MONGO_HOST',
  'REACTORY_MONGO_PORT',
  'REACTORY_MONGO_USER',
  'REACTORY_MONGO_PASSWORD',
  'REACTORY_POSTGRES_DB',
  'REACTORY_POSTGRES_HOST',
  'REACTORY_POSTGRES_PORT',
  'REACTORY_POSTGRES_USER',
  'REACTORY_POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'POSTGRES_DB_HOST',
  'POSTGRES_DB_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
];

/**
 * Load the settings registry with a controlled environment. `settings.ts`
 * resolves its connection defaults at import time, so a plain import would only
 * ever see whichever environment the test runner happened to start with.
 */
const loadSettings = (env: Record<string, string> = {}): any[] => {
  const saved: Record<string, string | undefined> = {};

  for (const key of MANAGED_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, env);

  let settings: any[] = [];
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    settings = require('../settings/settings').default;
  });

  for (const key of MANAGED_VARS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }

  return settings;
};

const findSetting = (settings: any[], name: string) =>
  settings.find((setting) => setting?.name === name);

const MONGOOSE_URI =
  'mongodb://reactory:secret@localhost:27017/reactory-reactory?socketTimeoutMS=360000&authSource=admin';

describe('reactory.mongodb.connection defaults', () => {
  it('derives the database from the MONGOOSE URI the server actually opens', () => {
    const settings = loadSettings({ MONGOOSE: MONGOOSE_URI });
    const mongo = findSetting(settings, 'reactory.mongodb.connection');

    expect(mongo).toBeDefined();
    expect(mongo.settingType).toBe('connection');
    // The defect: this used to be 'reactory', an empty database.
    expect(mongo.data.database).toBe('reactory-reactory');
    expect(mongo.data.host).toBe('localhost');
    expect(mongo.data.port).toBe(27017);
    expect(mongo.data.username).toBe('reactory');
    expect(mongo.data.password).toBe('secret');
    // The URI authenticates against `admin`. Without this the macro builds a
    // URI whose auth source defaults to the target database and the driver
    // rejects the credentials, so the connection would still be unusable.
    expect(mongo.data.options).toEqual({ authSource: 'admin' });
  });

  it('omits driver options when the URI does not name an auth source', () => {
    const settings = loadSettings({ MONGOOSE: 'mongodb://localhost:27017/reactory-reactory' });
    const mongo = findSetting(settings, 'reactory.mongodb.connection');

    expect(mongo.data.options).toBeUndefined();
  });

  it('lets REACTORY_MONGO_* override the URI field by field', () => {
    const settings = loadSettings({
      MONGOOSE: MONGOOSE_URI,
      REACTORY_MONGO_DB: 'reactory-settings-override',
      REACTORY_MONGO_HOST: 'mongo.internal',
    });
    const mongo = findSetting(settings, 'reactory.mongodb.connection');

    expect(mongo.data.database).toBe('reactory-settings-override');
    expect(mongo.data.host).toBe('mongo.internal');
    // Not overridden, so still from the URI.
    expect(mongo.data.port).toBe(27017);
  });

  it('falls back to MONGO_DB when no URI is configured', () => {
    const settings = loadSettings({ MONGO_DB: 'reactory-reactory' });
    const mongo = findSetting(settings, 'reactory.mongodb.connection');

    expect(mongo.data.database).toBe('reactory-reactory');
  });

  it('keeps a usable local default when nothing is configured', () => {
    const settings = loadSettings();
    const mongo = findSetting(settings, 'reactory.mongodb.connection');

    expect(mongo.data).toEqual({
      host: 'localhost',
      port: 27017,
      username: '',
      password: '',
      database: 'reactory',
    });
  });

  it('delegates to mongoConnectionSettings rather than resolving the variables itself', () => {
    // The settings module and the server's own data access must not be able to
    // disagree about the same variables. This fails if the registry goes back to
    // reading a private set of names with private defaults.
    const env = { MONGOOSE: MONGOOSE_URI };
    const settings = loadSettings(env);
    const mongo = findSetting(settings, 'reactory.mongodb.connection');

    expect(mongo.data).toEqual(mongoConnectionSettings({ ...env }, env.MONGOOSE));
  });
});

describe('reactory.postgres.connection defaults', () => {
  it('matches the REACTORY_POSTGRES_* variables the server uses', () => {
    const settings = loadSettings({
      REACTORY_POSTGRES_HOST: 'pg.internal',
      REACTORY_POSTGRES_PORT: '6543',
      REACTORY_POSTGRES_USER: 'reactory_user',
      REACTORY_POSTGRES_PASSWORD: 'reactory_pw',
      REACTORY_POSTGRES_DB: 'reactory_db',
    });
    const postgres = findSetting(settings, 'reactory.postgres.connection');

    expect(postgres.data).toEqual({
      host: 'pg.internal',
      port: 6543,
      username: 'reactory_user',
      password: 'reactory_pw',
      database: 'reactory_db',
    });
  });

  it('delegates to postgresConnectionSettings rather than resolving the variables itself', () => {
    const env = {
      REACTORY_POSTGRES_HOST: 'pg.internal',
      REACTORY_POSTGRES_PORT: '6543',
      REACTORY_POSTGRES_USER: 'reactory_user',
      REACTORY_POSTGRES_PASSWORD: 'reactory_pw',
      REACTORY_POSTGRES_DB: 'reactory_db',
    };
    const settings = loadSettings(env);
    const postgres = findSetting(settings, 'reactory.postgres.connection');

    expect(postgres.data).toEqual(postgresConnectionSettings({ ...env }));
  });

  it('keeps the historical defaults when nothing is configured', () => {
    const settings = loadSettings();
    const postgres = findSetting(settings, 'reactory.postgres.connection');

    expect(postgres.data).toEqual({
      host: 'localhost',
      port: 5432,
      username: 'reactory',
      password: 'reactory',
      database: 'reactory',
    });
  });
});

describe('registry variants are accepted by the tools they advertise', () => {
  /**
   * The registry declares the spelling; the macro accepts the canonical
   * variant. This is the pair that diverged.
   */
  const CONTRACTS: Array<{ setting: string; canonical: string; macro: { tools?: any[] } }> = [
    {
      setting: 'reactory.mongodb.connection',
      canonical: 'mongo',
      macro: MongoReadMacroRegistry,
    },
    {
      setting: 'reactory.postgres.connection',
      canonical: 'postgres',
      macro: PostgresMacroRegistry,
    },
  ];

  it.each(CONTRACTS)(
    '$setting declares a variant that resolves to the $canonical tool',
    ({ setting, canonical, macro }) => {
      const settings = loadSettings();
      const declared = findSetting(settings, setting);

      expect(declared).toBeDefined();
      expect(declared.settingType).toBe('connection');

      expect(normaliseDatabaseVariant(declared.variant)).toBe(canonical);
      expect(macro.tools?.[0].function.name).toBe(canonical);
    },
  );
});
