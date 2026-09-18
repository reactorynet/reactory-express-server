/**
 * Raw SQL execution against a client-configured connection.
 *
 * Used by the SQL Query Editor (`core.SQLQueryForm` via `ReactorySQLQuery`),
 * which runs a statement the user typed. This is the counterpart to
 * `sqlGuard.ts`: the guard decides *whether* a statement may run, this module
 * runs it against the right driver.
 *
 * Reads the connection's `variant` from the active partner's settings and
 * dispatches to the matching `ConnectionFactory`, so one form works against
 * postgres / mysql / mssql / databricks without hard-coding a driver. The
 * `reactory-reactor` AI data macros implement the same four drivers; they build
 * ad-hoc clients from settings, whereas this reuses core's cached factories.
 */

import Reactory from '@reactorynet/reactory-core';
import ApiError from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';

import { getConnectionFactory, resolveConnectionSettings } from './index';
import { queryAsync as mysqlQueryAsync } from './mysql/mysql';
import type { ReactoryDatabaseVariant } from './types';

/** Variants this module can execute raw SQL against. */
export const SQL_EXECUTABLE_VARIANTS: ReactoryDatabaseVariant[] = [
  'postgres',
  'mysql',
  'mssql',
  'databricks',
];

export interface ExecuteSqlResult {
  /** Result rows. Empty array for a statement that returns no rows. */
  rows: Record<string, any>[];
  /** Column names, in result order. Derived from the first row when needed. */
  columns: string[];
  /** The variant that actually served the query. */
  variant: ReactoryDatabaseVariant;
  /** Wall-clock execution time in milliseconds. */
  executionTimeMs: number;
}

/**
 * Best-effort column extraction. Drivers return rows as plain objects (or, for
 * mssql, recordsets of objects), so the first row's keys are the columns. A
 * driver may also hand back field metadata — `pickColumns` accepts that when
 * available so an empty result still reports its columns.
 */
function pickColumns(meta: unknown, rows: Record<string, any>[]): string[] {
  if (Array.isArray(meta) && meta.length > 0) {
    const names = meta
      .map((field: any) => field?.name ?? field?.columnName ?? field?.field)
      .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0);

    if (names.length > 0) return names;
  }

  if (rows.length > 0 && rows[0] && typeof rows[0] === 'object') {
    return Object.keys(rows[0]);
  }

  return [];
}

/**
 * Statement builders for paging a read-only query.
 *
 * Paging cannot be applied by appending `LIMIT` to the author's statement — it
 * may already end in a semicolon, or in a clause where a trailing LIMIT is
 * invalid. Wrapping the statement as a derived table leaves the author's SQL
 * untouched and lets us page over its result:
 *
 *     SELECT * FROM ( <author sql> ) AS __reactory_page LIMIT n OFFSET m
 *
 * `COUNT(*)` over the same wrapper gives the true total, so the client can show
 * an accurate page count instead of paginating over whatever was returned.
 *
 * Dialect notes:
 *  - MSSQL has no LIMIT/OFFSET; it needs `ORDER BY ... OFFSET n ROWS FETCH NEXT
 *    m ROWS ONLY`. Ordering by a constant expression satisfies the requirement
 *    without imposing a meaningful sort.
 *  - Wrapping a `WITH ...` (CTE) statement inside a derived table is valid on
 *    PostgreSQL, MySQL 8 and Databricks, but **not** on MSSQL. On MSSQL a form
 *    author using a CTE should page with their own TOP/OFFSET.
 */

/** Remove a trailing semicolon so the statement can be nested in a subquery. */
export function unwrapStatement(sql: string): string {
  return sql.trim().replace(/;+\s*$/, '');
}

/** SQL that returns the total row count of the author's statement. */
export function buildCountStatement(sql: string): string {
  return `SELECT COUNT(*) AS total FROM (${unwrapStatement(sql)}) AS __reactory_count`;
}

/** SQL that returns one page of the author's statement. */
export function buildPageStatement(
  sql: string,
  variant: ReactoryDatabaseVariant,
  page: number,
  pageSize: number,
): string {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * safeSize;
  const inner = unwrapStatement(sql);

  if (variant === 'mssql') {
    return `SELECT * FROM (${inner}) AS __reactory_page ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${safeSize} ROWS ONLY`;
  }

  return `SELECT * FROM (${inner}) AS __reactory_page LIMIT ${safeSize} OFFSET ${offset}`;
}

/**
 * Execute a single read-only SQL statement.
 *
 * Callers are responsible for validating the statement first
 * (`validateReadOnlySql`). This function does not re-validate — the guard is
 * applied at the resolver boundary where the error can be shaped for the user.
 *
 * @throws ApiError when the connection is missing, not a SQL variant, or when
 *         the driver reports an error (the driver message is preserved).
 */
export async function executeSqlQuery(
  connectionId: string,
  sql: string,
  context: Reactory.Server.IReactoryContext,
): Promise<ExecuteSqlResult> {
  if (!connectionId || connectionId.trim().length === 0) {
    throw new ApiError('A database connection must be selected before running a query');
  }

  if (!sql || sql.trim().length === 0) {
    throw new ApiError('A SQL statement must be provided before running a query');
  }

  const { variant } = resolveConnectionSettings(connectionId, context);

  if (SQL_EXECUTABLE_VARIANTS.indexOf(variant) === -1) {
    throw new ApiError(
      `Connection '${connectionId}' is a '${variant}' connection, which does not support SQL statements. ` +
        `Supported variants: ${SQL_EXECUTABLE_VARIANTS.join(', ')}`,
    );
  }

  const started = Date.now();
  const statement = sql.trim();
  logger.debug(`executeSqlQuery: running statement`, { connectionId, variant, statement });

  try {
    let rows: Record<string, any>[] = [];
    let columns: string[] = [];

    switch (variant) {
      case 'postgres': {
        const factory = getConnectionFactory('postgres');
        const using = await factory.getConnection(connectionId, context);
        // postgres.js `unsafe` runs a raw string without parameter binding.
        // Values are not interpolated here — the statement is author-supplied
        // and already constrained to read-only by the guard.
        const result: any = await (using as any).unsafe(statement);
        rows = Array.isArray(result) ? (result as Record<string, any>[]) : [];
        columns = pickColumns((result as any)?.columns, rows);
        break;
      }

      case 'mysql': {
        // Reuses the core helper: it resolves its own pool from settings and
        // promisifies the callback-based `mysql` driver.
        const result: any = await mysqlQueryAsync(statement, connectionId, null, context);
        if (Array.isArray(result)) {
          rows = result as Record<string, any>[];
        } else if (Array.isArray((result as any)?.rows)) {
          rows = (result as any).rows;
        }
        columns = pickColumns((result as any)?.fields, rows);
        break;
      }

      case 'mssql': {
        const factory = getConnectionFactory('mssql');
        const pool = await factory.getConnection(connectionId, context);
        const result: any = await (pool as any).request().query(statement);
        rows = Array.isArray(result?.recordset) ? result.recordset : [];
        columns = pickColumns(result?.recordset?.columns, rows);
        break;
      }

      case 'databricks': {
        // The databricks factory already owns the short-lived session dance.
        const factory = getConnectionFactory('databricks') as unknown as {
          executeQuery(
            connectionId: string,
            query: string,
            context: Reactory.Server.IReactoryContext,
          ): Promise<Record<string, any>[]>;
        };
        rows = await factory.executeQuery(connectionId, statement, context);
        columns = pickColumns(undefined, rows);
        break;
      }

      default: {
        throw new ApiError(`Unsupported SQL variant '${variant}'`);
      }
    }

    const executionTimeMs = Date.now() - started;
    logger.debug(`executeSqlQuery: completed`, {
      connectionId,
      variant,
      rowCount: rows.length,
      executionTimeMs,
    });

    return { rows, columns, variant, executionTimeMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`executeSqlQuery failed for connection '${connectionId}'`, { error, connectionId });
    throw new ApiError(`SQL execution failed: ${message}`);
  }
}
