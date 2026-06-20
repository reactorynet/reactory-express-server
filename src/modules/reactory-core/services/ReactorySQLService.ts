import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

/**
 * ReactorySQLService — relational database access for workflow steps (and any
 * other consumer) across MySQL, PostgreSQL and MS SQL Server.
 *
 * Design notes:
 *  - Drivers (mysql2 / pg / mssql) are imported LAZILY the first time an engine
 *    is used, so the service loads even if a particular driver is unavailable.
 *  - Connection pools are cached at MODULE level (process-wide singletons),
 *    keyed by engine + resolved connection, so repeated queries reuse pools
 *    regardless of how many times the service is instantiated per context.
 *  - Connection resolution precedence: explicit `connection` object →
 *    `connectionString` → named `connectionId` (env) → engine default (env).
 *
 * This is the Reactory-service abstraction the SQL workflow steps depend on so
 * they never open raw driver connections themselves.
 */

export type SQLEngine = 'mysql' | 'postgres' | 'mssql';

/** A connection object passed straight to the underlying driver. */
export interface SQLConnectionConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: any;
  [key: string]: any;
}

export interface SQLQueryRequest {
  engine: SQLEngine;
  /** Named connection resolved from env (e.g. "default", "reporting"). */
  connectionId?: string;
  /** Explicit connection object (wins over connectionId). */
  connection?: SQLConnectionConfig;
  /** Connection URL/DSN (wins over connectionId, behind `connection`). */
  connectionString?: string;
  /** SQL text. Placeholders: MySQL `?`, Postgres `$1..$n`, MSSQL `@p0..@pn`. */
  sql: string;
  /** Positional parameters bound to the placeholders. */
  parameters?: any[];
}

export interface SQLQueryResult {
  /** Row objects for SELECT-style queries (empty for writes). */
  rows: any[];
  /** Rows returned (SELECT) or affected (INSERT/UPDATE/DELETE). */
  rowCount: number;
  /** Field/column descriptors when the driver exposes them. */
  fields?: any[];
}

/** Process-wide pool cache shared across all service instances. */
const POOLS = new Map<string, Promise<any>>();

function envFirst(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return undefined;
}

export default class ReactorySQLService {
  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactorySQLService> = {
    id: 'core.ReactorySQLService@1.0.0',
    nameSpace: 'core',
    name: 'ReactorySQLService',
    version: '1.0.0',
    serviceType: 'data',
    description: 'Relational database access (MySQL / PostgreSQL / MS SQL Server) with pooled connections',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext): ReactorySQLService =>
      new ReactorySQLService(props, context),
  };

  name = 'ReactorySQLService';

  nameSpace = 'core';

  version = '1.0.0';

  props: Reactory.Service.IReactoryServiceProps;

  context: Reactory.Server.IReactoryContext;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }

  /**
   * Execute a parameterized SQL query against the requested engine/connection.
   * Returns a normalized result regardless of the underlying driver.
   */
  async query(request: SQLQueryRequest): Promise<SQLQueryResult> {
    const { engine, sql, parameters = [] } = request;
    if (!sql || typeof sql !== 'string') {
      throw new Error('ReactorySQLService.query: `sql` is required');
    }

    const { key, connectionString, connection } = this.resolveConnection(request);
    const pool = await this.getPool(engine, key, connectionString, connection);

    switch (engine) {
      case 'mysql':
        return this.queryMySql(pool, sql, parameters);
      case 'postgres':
        return this.queryPostgres(pool, sql, parameters);
      case 'mssql':
        return this.queryMssql(pool, sql, parameters);
      default:
        throw new Error(`Unsupported SQL engine: "${engine}"`);
    }
  }

  /**
   * Resolve the effective connection for a request, returning a stable cache key.
   */
  private resolveConnection(request: SQLQueryRequest): {
    key: string;
    connectionString?: string;
    connection?: SQLConnectionConfig;
  } {
    const { engine, connection, connectionString, connectionId } = request;

    if (connection && typeof connection === 'object') {
      return { key: `${engine}::obj::${stableKey(connection)}`, connection };
    }

    if (connectionString) {
      return { key: `${engine}::str::${connectionString}`, connectionString };
    }

    const resolved = this.resolveConnectionStringFromId(engine, connectionId);
    if (!resolved) {
      throw new Error(
        `No SQL connection resolved for engine "${engine}"` +
          (connectionId ? ` and connectionId "${connectionId}"` : '') +
          '. Provide `connection`, `connectionString`, or set the appropriate env var.',
      );
    }
    return { key: `${engine}::id::${connectionId || 'default'}`, connectionString: resolved };
  }

  /**
   * Resolve a connection URL from a named connectionId via environment variables.
   * `default`/absent falls back to engine-specific conventional vars.
   */
  private resolveConnectionStringFromId(engine: SQLEngine, connectionId?: string): string | undefined {
    if (connectionId && connectionId !== 'default') {
      const upper = connectionId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const named = envFirst(`REACTORY_SQL_${upper}_URL`, `SQL_${upper}_URL`);
      if (named) return named;
    }

    switch (engine) {
      case 'mysql':
        return envFirst('REACTORY_MYSQL_URL', 'MYSQL_URL');
      case 'postgres':
        return envFirst('WORKFLOW_POSTGRES_URL', 'REACTORY_POSTGRES_URL', 'POSTGRES_URL');
      case 'mssql':
        return envFirst('REACTORY_MSSQL_URL', 'MSSQL_URL');
      default:
        return undefined;
    }
  }

  /** Get (or lazily create + cache) a connection pool for the resolved connection. */
  private getPool(
    engine: SQLEngine,
    key: string,
    connectionString?: string,
    connection?: SQLConnectionConfig,
  ): Promise<any> {
    const existing = POOLS.get(key);
    if (existing) return existing;

    const created = this.createPool(engine, connectionString, connection).catch((err) => {
      // Don't cache a failed pool — allow a later retry.
      POOLS.delete(key);
      throw err;
    });
    POOLS.set(key, created);
    return created;
  }

  private async createPool(
    engine: SQLEngine,
    connectionString?: string,
    connection?: SQLConnectionConfig,
  ): Promise<any> {
    logger.debug(`ReactorySQLService: creating ${engine} pool`);
    switch (engine) {
      case 'mysql': {
        const mysql = await import('mysql2/promise');
        return mysql.createPool((connectionString as any) || (connection as any));
      }
      case 'postgres': {
        const pg = await import('pg');
        const Pool = (pg as any).Pool || (pg as any).default?.Pool;
        return new Pool(connectionString ? { connectionString } : connection);
      }
      case 'mssql': {
        const mssql: any = await import('mssql');
        const ConnectionPool = mssql.ConnectionPool || mssql.default?.ConnectionPool;
        const pool = new ConnectionPool((connectionString as any) || (connection as any));
        return pool.connect();
      }
      default:
        throw new Error(`Unsupported SQL engine: "${engine}"`);
    }
  }

  private async queryMySql(pool: any, sql: string, parameters: any[]): Promise<SQLQueryResult> {
    const [rows, fields] = await pool.query(sql, parameters);
    if (Array.isArray(rows)) {
      return { rows, rowCount: rows.length, fields };
    }
    // ResultSetHeader for INSERT/UPDATE/DELETE
    return { rows: [], rowCount: rows?.affectedRows ?? 0, fields };
  }

  private async queryPostgres(pool: any, sql: string, parameters: any[]): Promise<SQLQueryResult> {
    const res = await pool.query(sql, parameters);
    return { rows: res.rows || [], rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0), fields: res.fields };
  }

  private async queryMssql(pool: any, sql: string, parameters: any[]): Promise<SQLQueryResult> {
    const request = pool.request();
    parameters.forEach((value, i) => request.input(`p${i}`, value));
    const res = await request.query(sql);
    const rows = res.recordset || [];
    const affected = Array.isArray(res.rowsAffected) ? res.rowsAffected[0] : res.rowsAffected;
    return {
      rows,
      rowCount: rows.length || affected || 0,
      fields: res.recordset?.columns ? Object.values(res.recordset.columns) : undefined,
    };
  }

  /** Close and clear all pooled connections (best-effort). */
  static async closeConnections(): Promise<void> {
    const pools = Array.from(POOLS.values());
    POOLS.clear();
    await Promise.all(
      pools.map(async (p) => {
        try {
          const pool = await p;
          if (typeof pool.end === 'function') await pool.end();
          else if (typeof pool.close === 'function') await pool.close();
        } catch (err) {
          logger.warn(`ReactorySQLService: error closing pool: ${err instanceof Error ? err.message : err}`);
        }
      }),
    );
  }
}

/** Produce a stable cache key for a connection object (order-independent). */
function stableKey(obj: Record<string, any>): string {
  return Object.keys(obj)
    .sort()
    .map((k) => `${k}=${typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : obj[k]}`)
    .join('&');
}
