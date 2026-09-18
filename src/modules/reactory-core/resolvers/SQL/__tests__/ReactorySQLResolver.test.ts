import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, buildASTSchema, GraphQLObjectType, GraphQLList } from 'graphql';
import Reactory from '@reactorynet/reactory-core';

import ReactorySQLResolver from '../ReactorySQLResolver';

/**
 * These tests exercise the `ReactorySQLDataConnections` query that powers the
 * SQL Query Editor's connection picker. They call the resolver directly so the
 * behaviour is verified without needing a running server — the GraphQL SDL is
 * parsed separately below to prove the field is actually exposed.
 */

const settings = [
  {
    name: 'reactory.postgres.connection',
    title: 'Reactory Default Postgres Connection',
    settingType: 'connection',
    variant: 'postgres',
    data: { host: 'localhost', port: 5432, database: 'reactory', password: 'secret' },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.mysql.connection',
    settingType: 'connection',
    variant: 'mysql',
    data: { host: 'db.internal', port: 3306, database: 'sales' },
  },
  {
    name: 'reactory.mongodb.connection',
    settingType: 'connection',
    variant: 'mongo',
    data: { host: 'localhost', port: 27017, database: 'reactory' },
  },
  {
    name: 'reactory.prometheus.connection',
    settingType: 'connection',
    variant: 'prometheus',
    data: { host: 'localhost', port: 9090 },
  },
];

const buildContext = (
  hasAnyRole: ((roles: string[]) => boolean) | null = () => true,
): Reactory.Server.IReactoryContext =>
  ({
    partner: {
      name: 'Reactory',
      key: 'reactory',
      settings,
      // `resolveConnectionSettings` resolves a single setting by name via this
      // method (mirrors the ReactoryClient model).
      getSetting: (name: string) => settings.find((s) => s.name === name) ?? null,
    },
    ...(hasAnyRole ? { hasAnyRole } : {}),
  }) as unknown as Reactory.Server.IReactoryContext;

const runQuery = (params: { variants?: string[] } = {}, context = buildContext()) =>
  ReactorySQLResolver.Query.ReactorySQLDataConnections({}, params, context);

/** Runs the SQL-execution query. `executeSqlQuery` is mocked (see top of file). */
const runSqlQuery = (input: any, context = buildContext()) =>
  ReactorySQLResolver.Query.ReactorySQLQuery({}, { connectionId: input?.context?.connectionId, input }, context);

// Only the executor is stubbed; the statement builders are the real ones, so
// the assertions below inspect exactly what would be sent to a driver.
jest.mock('@reactory/server-core/database/executors', () => {
  const actual = jest.requireActual('@reactory/server-core/database/executors');
  return { ...actual, executeSqlQuery: jest.fn() };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executeSqlQuery } = require('@reactory/server-core/database/executors');

/**
 * The SQL type-defs file uses `extend type Query/Mutation` and the custom
 * `Any` scalar, which only exist once the whole schema is assembled. Provide
 * the minimum base declarations so the fragment can be built standalone.
 */
const BASE_SDL = `
scalar Any

type Query {
  _placeholder: String
}

type Mutation {
  _placeholder: String
}
`;

const buildTestSchema = (sdl: string) => buildASTSchema(parse(`${BASE_SDL}\n${sdl}`));

describe('ReactorySQLDataConnections resolver', () => {
  it('returns the SQL-capable connections for an authorised caller', async () => {
    const connections = await runQuery();

    expect(connections.map((c) => c.connectionId).sort()).toEqual([
      'reactory.mysql.connection',
      'reactory.postgres.connection',
    ]);
  });

  it('excludes non-SQL variants (mongo) and non-database connections (prometheus)', async () => {
    const connections = await runQuery();

    expect(connections.map((c) => c.variant)).not.toContain('mongo');
    expect(connections.map((c) => c.variant)).not.toContain('prometheus');
  });

  it('returns the descriptor shape the picker needs', async () => {
    const [connection] = await runQuery({ variants: ['postgres'] });

    expect(connection).toMatchObject({
      connectionId: 'reactory.postgres.connection',
      variant: 'postgres',
      label: 'Reactory Default Postgres Connection',
      database: 'reactory',
      host: 'localhost',
      port: 5432,
    });
  });

  it('never exposes credentials', async () => {
    const connections = await runQuery();

    expect(JSON.stringify(connections)).not.toContain('secret');
    expect(JSON.stringify(connections)).not.toContain('password');
  });

  it('hides ADMIN-only connections from a caller without the role', async () => {
    const connections = await runQuery({}, buildContext(() => false));

    // postgres is ADMIN-only; mysql is open.
    expect(connections.map((c) => c.connectionId)).toEqual(['reactory.mysql.connection']);
  });

  it('fails closed when caller roles cannot be evaluated', async () => {
    const connections = await runQuery({}, buildContext(null));

    expect(connections.map((c) => c.connectionId)).toEqual(['reactory.mysql.connection']);
  });

  it('narrows to requested SQL variants', async () => {
    const connections = await runQuery({ variants: ['mysql'] });

    expect(connections.map((c) => c.variant)).toEqual(['mysql']);
  });

  it('ignores requested variants outside the SQL set', async () => {
    // The query is the SQL editor's picker; it must not be usable to enumerate
    // mongo/redis connections even if a caller asks for them explicitly.
    const connections = await runQuery({ variants: ['mongo', 'redis'] });

    expect(connections).toEqual([]);
  });

  it('intersects partially-valid variant requests with the SQL set', async () => {
    const connections = await runQuery({ variants: ['mongo', 'mysql'] });

    expect(connections.map((c) => c.variant)).toEqual(['mysql']);
  });

  it('returns an empty list when there is no active partner', async () => {
    const connections = await runQuery({}, {} as Reactory.Server.IReactoryContext);

    expect(connections).toEqual([]);
  });

  it('returns an empty list rather than throwing when settings are malformed', async () => {
    const context = {
      partner: { settings: 'not-an-array' },
    } as unknown as Reactory.Server.IReactoryContext;

    await expect(runQuery({}, context)).resolves.toEqual([]);
  });
});

describe('ReactorySQLQuery resolver — raw statement execution', () => {
  const validInput = {
    context: {
      connectionId: 'reactory.postgres.connection',
      commandText: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    },
    paging: { page: 1, pageSize: 50 },
  };

  /** The statement sent on the Nth executor call (0 = COUNT, 1 = page). */
  const statementAt = (i: number): string => executeSqlQuery.mock.calls[i][1];

  beforeEach(() => {
    executeSqlQuery.mockReset();
    // Call 0 is the COUNT, call 1 is the page fetch. Both are distinguished by
    // shape so the assertions can inspect exactly what a driver would receive.
    executeSqlQuery.mockImplementation(async (_id: string, sql: string) => {
      if (/COUNT\(\*\)/.test(sql)) {
        return { rows: [{ total: '32' }], columns: ['total'], variant: 'postgres', executionTimeMs: 2 };
      }
      return {
        rows: [{ table_name: 'reactory_audit' }, { table_name: 'reactory_calendar' }],
        columns: ['table_name'],
        variant: 'postgres',
        executionTimeMs: 7,
      };
    });
  });

  it('counts the total, then fetches only the requested page', async () => {
    await runSqlQuery(validInput);

    expect(executeSqlQuery).toHaveBeenCalledTimes(2);

    // The COUNT wraps the author's statement rather than rewriting it.
    expect(statementAt(0)).toMatch(/^SELECT COUNT\(\*\) AS total FROM \(/);
    expect(statementAt(0)).toContain("WHERE table_schema = 'public'");

    // The page fetch wraps it too, and applies LIMIT/OFFSET.
    expect(statementAt(1)).toContain("WHERE table_schema = 'public'");
    expect(statementAt(1)).toMatch(/\) AS __reactory_page LIMIT 50 OFFSET 0$/);
  });

  it('reports the true total from the COUNT and the rows on this page', async () => {
    const result = await runSqlQuery(validInput);

    expect(result.data).toEqual([{ table_name: 'reactory_audit' }, { table_name: 'reactory_calendar' }]);
    expect(result.paging).toEqual({ total: 32, page: 1, pageSize: 50, hasNext: false });
  });

  it('does not slice in memory — the database returns exactly one page', async () => {
    // 200 rows would arrive if the driver ignored LIMIT; the resolver must pass
    // them through untouched rather than re-paging over them.
    executeSqlQuery.mockImplementation(async (_id: string, sql: string) => {
      if (/COUNT\(\*\)/.test(sql)) {
        return { rows: [{ total: '200' }], columns: ['total'], variant: 'postgres', executionTimeMs: 1 };
      }
      return {
        rows: Array.from({ length: 25 }, (_, i) => ({ n: i })),
        columns: ['n'],
        variant: 'postgres',
        executionTimeMs: 4,
      };
    });

    const result = await runSqlQuery({ ...validInput, paging: { page: 3, pageSize: 25 } });

    expect(statementAt(1)).toMatch(/LIMIT 25 OFFSET 50$/);
    expect(result.data).toHaveLength(25);
    expect(result.paging.total).toBe(200);
    expect(result.paging.hasNext).toBe(true);
  });

  it('derives the result columns from the page rows, marking them selected', async () => {
    const result = await runSqlQuery(validInput);

    expect(result.columns).toEqual([
      { field: 'table_name', title: 'table_name', widget: 'text', selected: true },
    ]);
  });

  it('echoes the connection context back, defaulting provider to the variant', async () => {
    const result = await runSqlQuery(validInput);

    expect(result.context.connectionId).toBe('reactory.postgres.connection');
    expect(result.context.provider).toBe('postgres');
  });

  it('defaults to page 1 and 50 rows when paging is omitted', async () => {
    await runSqlQuery({ context: validInput.context });

    expect(statementAt(1)).toMatch(/LIMIT 50 OFFSET 0$/);
  });

  it('clamps an oversized pageSize', async () => {
    await runSqlQuery({ ...validInput, paging: { page: 1, pageSize: 10_000_000 } });

    expect(statementAt(1)).toMatch(/LIMIT 5000 OFFSET 0$/);
  });

  it('rejects when no connection is selected', async () => {
    await expect(
      runSqlQuery({ context: { commandText: 'SELECT 1' } }),
    ).rejects.toThrow(/connection must be selected/i);
    expect(executeSqlQuery).not.toHaveBeenCalled();
  });

  it('rejects when no statement is provided', async () => {
    await expect(
      runSqlQuery({ context: { connectionId: 'reactory.postgres.connection' } }),
    ).rejects.toThrow(/statement must be provided/i);
    expect(executeSqlQuery).not.toHaveBeenCalled();
  });

  it('does not reach the driver for a write statement', async () => {
    await expect(
      runSqlQuery({
        context: { connectionId: 'reactory.postgres.connection', commandText: 'DROP TABLE users' },
      }),
    ).rejects.toThrow(/SELECT|read-only/i);

    expect(executeSqlQuery).not.toHaveBeenCalled();
  });

  it('does not reach the driver for a multi-statement payload', async () => {
    await expect(
      runSqlQuery({
        context: {
          connectionId: 'reactory.postgres.connection',
          commandText: 'SELECT 1; DROP TABLE users',
        },
      }),
    ).rejects.toThrow(/single SQL statement/i);

    expect(executeSqlQuery).not.toHaveBeenCalled();
  });

  it('propagates a driver failure as an error', async () => {
    executeSqlQuery.mockRejectedValue(new Error('SQL execution failed: relation "nope" does not exist'));

    await expect(runSqlQuery(validInput)).rejects.toThrow(/relation "nope" does not exist/);
  });
});
});

describe('ReactorySQL.graphql SDL', () => {
  const sdlPath = join(__dirname, '..', '..', '..', 'graph', 'types', 'SQL', 'ReactorySQL.graphql');

  it('parses as valid GraphQL', () => {
    expect(() => parse(readFileSync(sdlPath, 'utf-8'))).not.toThrow();
  });

  it('exposes ReactorySQLDataConnections on the Query type returning a list', () => {
    const schema = buildTestSchema(readFileSync(sdlPath, 'utf-8'));
    const queryType = schema.getType('Query') as GraphQLObjectType;

    const field = queryType.getFields().ReactorySQLDataConnections;

    expect(field).toBeDefined();
    expect(field.type).toBeInstanceOf(GraphQLList);
    expect((field.type as GraphQLList<any>).ofType.toString()).toBe('SQLDataConnection');
    expect(field.args.map((a) => a.name)).toEqual(['variants']);
  });

  it('declares the picker-facing fields on SQLDataConnection', () => {
    const schema = buildTestSchema(readFileSync(sdlPath, 'utf-8'));
    const connectionType = schema.getType('SQLDataConnection') as GraphQLObjectType;

    expect(Object.keys(connectionType.getFields()).sort()).toEqual([
      'connectionId',
      'database',
      'description',
      'host',
      'label',
      'port',
      'roles',
      'title',
      'variant',
    ]);

    // Credentials must never be part of the public contract.
    expect(connectionType.getFields().password).toBeUndefined();
    expect(connectionType.getFields().username).toBeUndefined();
  });
});
