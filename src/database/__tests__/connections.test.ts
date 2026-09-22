import Reactory from '@reactorynet/reactory-core';
import {
  listConnectionSettings,
  isConnectionSetting,
  resolveSettingVariant,
  SQL_VARIANTS,
  SUPPORTED_VARIANTS,
} from '../connections';

/**
 * Builds a fake partner document with the given settings, plus a context stub
 * whose `hasAnyRole` is driven by the supplied predicate.
 *
 * Defaults to a permissive checker so tests that are not exercising role
 * filtering don't accidentally drop the role-protected `postgres` fixture.
 * Pass `null` to omit the checker entirely (simulates an unevaluable caller).
 */
const buildContext = (
  settings: any[],
  hasAnyRole: ((roles: string[]) => boolean) | null = () => true,
): Reactory.Server.IReactoryContext =>
  ({
    partner: { name: 'Reactory', key: 'reactory', settings },
    ...(hasAnyRole ? { hasAnyRole } : {}),
  }) as unknown as Reactory.Server.IReactoryContext;

const postgresSetting = {
  name: 'reactory.postgres.connection',
  title: 'Reactory Default Postgres Connection',
  settingType: 'connection',
  variant: 'postgres',
  data: {
    host: 'localhost',
    port: 5432,
    database: 'reactory',
    username: 'reactory',
    password: 'super-secret',
  },
  roles: ['ADMIN'],
};

const mysqlSetting = {
  name: 'reactory.mysql.connection',
  settingType: 'connection',
  variant: 'mysql',
  data: { host: 'db.internal', port: '3306', database: 'sales' },
};

const mongoSetting = {
  name: 'reactory.mongodb.connection',
  settingType: 'connection',
  variant: 'mongo',
  data: { host: 'localhost', port: 27017, database: 'reactory' },
};

const redisSetting = {
  name: 'reactory.redis.connection',
  settingType: 'connection',
  variant: 'redis',
  data: { host: 'localhost', port: 6379 },
};

const prometheusSetting = {
  name: 'reactory.prometheus.connection',
  settingType: 'connection',
  variant: 'prometheus',
  data: { host: 'localhost', port: 9090 },
};

const nonConnectionSetting = {
  name: 'new_user_roles',
  data: ['USER'],
  roles: ['ADMIN'],
};

describe('database/connections — setting predicates', () => {
  it('recognises connection settings by settingType or legacy type', () => {
    expect(isConnectionSetting({ settingType: 'connection' })).toBe(true);
    expect(isConnectionSetting({ type: 'connection' })).toBe(true);
    expect(isConnectionSetting({ settingType: 'object' })).toBe(false);
    expect(isConnectionSetting({})).toBe(false);
  });

  it('prefers the variant declared inside data over the one on the setting', () => {
    expect(resolveSettingVariant({ variant: 'postgres', data: { variant: 'mysql' } })).toBe('mysql');
    expect(resolveSettingVariant({ settingType: 'connection', variant: 'postgres' })).toBe('postgres');
    expect(resolveSettingVariant({ settingType: 'connection' })).toBeUndefined();
  });

  it('exposes SQL variants without the document/key-value stores', () => {
    expect(SQL_VARIANTS).toEqual(['postgres', 'mysql', 'mssql', 'databricks']);
    expect(SQL_VARIANTS).not.toContain('mongo');
    expect(SQL_VARIANTS).not.toContain('redis');

    // `redis` is a valid client connection setting (see
    // clientConfigs/reactory/settings) but is provided by the reactory-cache
    // module rather than core, so core's supported-variant list omits it —
    // and therefore so does listConnectionSettings. Mongo IS core-supported.
    expect(SUPPORTED_VARIANTS).toEqual(
      expect.arrayContaining(['mongo', 'mysql', 'postgres', 'mssql', 'databricks']),
    );
    expect(SUPPORTED_VARIANTS).not.toContain('redis');
  });
});

describe('database/connections — listConnectionSettings', () => {
  it('returns an empty list when there is no active partner', () => {
    expect(listConnectionSettings({} as Reactory.Server.IReactoryContext)).toEqual([]);
    expect(
      listConnectionSettings({ partner: undefined } as unknown as Reactory.Server.IReactoryContext),
    ).toEqual([]);
  });

  it('returns an empty list when the partner declares no settings', () => {
    expect(
      listConnectionSettings({ partner: { settings: null } } as unknown as Reactory.Server.IReactoryContext),
    ).toEqual([]);
  });

  it('lists only connection settings, ignoring other client settings', () => {
    const result = listConnectionSettings(
      buildContext([postgresSetting, nonConnectionSetting], () => true),
      undefined,
    );

    expect(result).toHaveLength(1);
    expect(result[0].connectionId).toBe('reactory.postgres.connection');
  });

  it('maps the safe descriptor and never leaks credentials', () => {
    const [connection] = listConnectionSettings(buildContext([postgresSetting]), undefined);

    expect(connection).toMatchObject({
      connectionId: 'reactory.postgres.connection',
      variant: 'postgres',
      label: 'Reactory Default Postgres Connection',
      title: 'Reactory Default Postgres Connection',
      host: 'localhost',
      port: 5432,
      database: 'reactory',
      roles: ['ADMIN'],
    });

    expect(Object.keys(connection)).not.toContain('password');
    expect(Object.keys(connection)).not.toContain('username');
    expect(JSON.stringify(connection)).not.toContain('super-secret');
  });

  it('falls back to the setting name when no title is authored', () => {
    const [connection] = listConnectionSettings(buildContext([mysqlSetting]), undefined);

    expect(connection.label).toBe('reactory.mysql.connection');
    expect(connection.title).toBeUndefined();
  });

  it('coerces string ports to numbers', () => {
    const [connection] = listConnectionSettings(buildContext([mysqlSetting]), undefined);

    expect(connection.port).toBe(3306);
  });

  it('excludes non-database variants such as prometheus', () => {
    const result = listConnectionSettings(buildContext([prometheusSetting, postgresSetting]), undefined);

    expect(result.map((c) => c.connectionId)).toEqual(['reactory.postgres.connection']);
  });

  it('defaults to every core-supported variant, so mongo is included but redis is not', () => {
    const all = [postgresSetting, mysqlSetting, mongoSetting, redisSetting];
    const result = listConnectionSettings(buildContext(all), undefined);

    expect(result.map((c) => c.variant).sort()).toEqual(['mongo', 'mysql', 'postgres']);
  });

  it('honours the SQL variant allow-list, excluding mongo and redis', () => {
    const all = [postgresSetting, mysqlSetting, mongoSetting, redisSetting];
    const result = listConnectionSettings(buildContext(all), SQL_VARIANTS);

    expect(result.map((c) => c.variant).sort()).toEqual(['mysql', 'postgres']);
  });

  it('narrows to the requested variants when supplied', () => {
    const all = [postgresSetting, mysqlSetting, mongoSetting];
    const result = listConnectionSettings(buildContext(all), ['mysql']);

    expect(result.map((c) => c.variant)).toEqual(['mysql']);
  });

  it('lists an open connection (no roles) without consulting the role checker', () => {
    const hasAnyRole = jest.fn().mockReturnValue(false);
    const [connection] = listConnectionSettings(buildContext([mysqlSetting], hasAnyRole), ['mysql']);

    expect(connection.connectionId).toBe('reactory.mysql.connection');
    expect(hasAnyRole).not.toHaveBeenCalled();
  });

  it('includes a role-protected connection when the caller holds the role', () => {
    const result = listConnectionSettings(
      buildContext([postgresSetting], (roles) => roles.includes('ADMIN')),
      undefined,
    );

    expect(result.map((c) => c.connectionId)).toEqual(['reactory.postgres.connection']);
  });

  it('denies a role-protected connection when the caller lacks the role', () => {
    const result = listConnectionSettings(
      buildContext([postgresSetting], () => false),
      undefined,
    );

    expect(result).toHaveLength(0);
  });

  it('denies a role-protected connection when caller roles cannot be evaluated', () => {
    // No `hasAnyRole` on the context at all — fail closed.
    const result = listConnectionSettings(buildContext([postgresSetting], null), undefined);

    expect(result).toHaveLength(0);
  });

  it('denies a role-protected connection when the role checker throws', () => {
    const result = listConnectionSettings(
      buildContext([postgresSetting], () => {
        throw new Error('role lookup unavailable');
      }),
      undefined,
    );

    expect(result).toHaveLength(0);
  });

  it('ignores connection settings with no name or no resolvable variant', () => {
    const result = listConnectionSettings(
      buildContext([
        { settingType: 'connection', variant: 'postgres', data: {} },
        { name: 'broken.connection', settingType: 'connection', data: {} },
      ]),
      undefined,
    );

    expect(result).toEqual([]);
  });

  it('returns an empty list rather than throwing on a malformed settings collection', () => {
    expect(
      listConnectionSettings(
        { partner: { settings: 'not-an-array' } } as unknown as Reactory.Server.IReactoryContext,
      ),
    ).toEqual([]);
  });
});
