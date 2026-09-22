import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';

import {
  listConnectionSettings,
  resolveConnectionSettings,
  SQL_VARIANTS,
  type IListedDatabaseConnection,
} from '@reactory/server-core/database/connections';
import {
  buildCountStatement,
  buildPageStatement,
  executeSqlQuery,
} from '@reactory/server-core/database/executors';
import { validateReadOnlySql } from '@reactory/server-core/database/sqlGuard';
import type { ReactoryDatabaseVariant } from '@reactory/server-core/database/types';
import {
  SQLDelete,
  SQLDeleteResult,
  SQLInsert,
  SQLInsertResult,
  SQLUpdate,
  SQLUpdateResult,
} from '@reactory/server-core/database/types';

interface SQLQueryParams {
  connectionId: string;
  input: SQLQuery;
}

interface SQLDataConnectionsParams {
  /** Optional allow-list of variants. Defaults to SQL-capable variants. */
  variants?: string[];
}

type SQLDataConnection = IListedDatabaseConnection;

interface SQLColumn {
  field: string;
  title: string;
  widget: string;
  selected: boolean;
}

/**
 * Shape returned to the client. Mirrors the `SQLQueryResult` GraphQL type:
 * `paging`, `columns`, `filters`, `context`, `data`.
 */
interface SQLQueryResult {
  paging: { total: number; page: number; hasNext: boolean; pageSize: number };
  columns: SQLColumn[];
  filters: any[];
  context: any;
  data: Record<string, any>[];
}

/**
 * Input for `ReactorySQLQuery`.
 *
 * Contract change (SQL Query Editor): this used to accept a *structured* query
 * request (schema + table + columns + filters) which the MySQL query-string
 * generator turned into SQL — and which ignored `commandText` entirely. The
 * editor's purpose is "type a SQL statement and run it", so the operation now
 * executes `context.commandText` directly, against whichever driver the selected
 * connection uses. `columns` and paging are no longer required inputs.
 */
interface SQLQuery {
  /** Free-form read-only SQL, executed verbatim. */
  context: {
    /** Setting name of the connection to run against. Required. */
    connectionId: string;
    /** The SQL statement to execute. Required. */
    commandText?: string;
    /** Optional, echoed back in the result. */
    schema?: string;
    table?: string;
    provider?: string;
  };
  /** Optional paging; used to trim/report on the result set. */
  paging?: { page?: number; pageSize?: number; total?: number };
  /** Optional, echoed back in the result. */
  columns?: SQLColumn[];
  filters?: any[];
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
/** Guard against an accidental full-table dump into the MaterialTableWidget. */
const MAX_PAGE_SIZE = 5000;

/**
 * Derive the result column descriptors from the driver's column names. Raw SQL
 * doesn't declare widgets, so the table widget renders every column as text and
 * marks them all selected.
 */
function columnsFrom(names: string[], requested?: SQLColumn[]): SQLColumn[] {
  if (Array.isArray(requested) && requested.length > 0) return requested;

  return names.map((field) => ({
    field,
    title: field,
    widget: 'text',
    selected: true,
  }));
}

const ReactorySQLResolver = {
  Query: {
    /**
     * Lists SQL-capable data connections available to the caller.
     *
     * Powers the SQL Query Editor's connection picker (via the SelectWithData
     * widget) so the dropdown reflects the connections actually configured for
     * the active partner rather than a hard-coded list. Role-aware: ADMIN-only
     * settings are hidden from non-admins.
     *
     * Mongo/Redis are intentionally excluded — those are surfaced through their
     * own editors. Pass `variants` to narrow further.
     */
    ReactorySQLDataConnections: async (
      obj: any,
      params: SQLDataConnectionsParams = {},
      context: Reactory.Server.IReactoryContext,
    ): Promise<SQLDataConnection[]> => {
      const requested = (params.variants ?? [])
        .filter((variant): variant is string => typeof variant === 'string' && variant.trim().length > 0)
        .map((variant) => variant.trim().toLowerCase()) as ReactoryDatabaseVariant[];

      // Intersect the caller's request with the SQL-capable set so the query
      // can never be used to enumerate non-SQL connections.
      const allowed = requested.length > 0
        ? SQL_VARIANTS.filter((variant) => requested.indexOf(variant) !== -1)
        : SQL_VARIANTS;

      try {
        return listConnectionSettings(context, allowed);
      } catch (error) {
        logger.error('Error listing SQL data connections:', error);
        return [];
      }
    },

    /**
     * Executes the SQL statement supplied by the SQL Query Editor.
     *
     * Behaviour:
     *  - `input.context.connectionId` and `input.context.commandText` are required.
     *  - The statement is validated as a **single read-only query** by
     *    `validateReadOnlySql` before it reaches a driver. Rejections are
     *    returned as an ApiError with the guard's reason.
     *  - Execution dispatches on the connection's variant
     *    (postgres | mysql | mssql | databricks) — previously this hard-coded the
     *    MySQL generator, so a postgres connection would have been driven by the
     *    wrong driver.
     *  - `columns` are derived from the result set unless the caller supplied them.
     *  - Paging reports over the returned rows; `pageSize` caps how many rows are
     *    handed to the client without changing the statement.
     */
    ReactorySQLQuery: async (
      obj: any,
      params: SQLQueryParams,
      context: Reactory.Server.IReactoryContext,
    ): Promise<SQLQueryResult> => {
      const input = params?.input;
      const connectionId = input?.context?.connectionId;
      const commandText = input?.context?.commandText;

      if (!connectionId || `${connectionId}`.trim().length === 0) {
        throw new ApiError('A database connection must be selected before running a query');
      }

      if (!commandText || `${commandText}`.trim().length === 0) {
        throw new ApiError('A SQL statement must be provided before running a query');
      }

      // Verify the connection exists and is SQL-capable before validating the
      // statement, so a bad connection surfaces as a connection error.
      const { variant: executed_variant } = resolveConnectionSettings(connectionId, context);

      const guard = validateReadOnlySql(commandText);
      if (!guard.valid) {
        logger.warn(`Rejected SQL statement from user`, {
          connectionId,
          reason: guard.error,
          // Log the statement for audit; it is read-only by the time we log.
          commandText,
        });
        throw new ApiError(guard.error ?? 'The SQL statement was rejected');
      }

      const page = Number.isFinite(Number(input?.paging?.page)) && Number(input?.paging?.page) > 0
        ? Number(input?.paging?.page)
        : DEFAULT_PAGE;
      const requestedPageSize = Number(input?.paging?.pageSize);
      const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

      // Paging is applied in the database, not in memory: the author's
      // statement is wrapped as a derived table and paged with LIMIT/OFFSET
      // (MSSQL: OFFSET/FETCH). Returning only the requested page keeps large
      // result sets off the wire, and the COUNT over the same wrapper gives the
      // true total so the client can render an accurate page count.
      const counted = await executeSqlQuery(connectionId, buildCountStatement(commandText), context);
      const total = Number(counted.rows?.[0]?.total ?? 0);

      const executed = await executeSqlQuery(
        connectionId,
        buildPageStatement(commandText, executed_variant, page, pageSize),
        context,
      );

      const data = executed.rows ?? [];

      logger.debug('ReactorySQLQuery executed', {
        connectionId,
        variant: executed.variant,
        page,
        pageSize,
        total,
        rowsOnPage: data.length,
        executionTimeMs: executed.executionTimeMs,
      });

      return {
        paging: {
          total,
          page,
          pageSize,
          hasNext: page * pageSize < total,
        },
        columns: columnsFrom(executed.columns ?? [], input?.columns),
        filters: input?.filters ?? [],
        context: {
          ...input.context,
          connectionId,
          commandText,
          provider: input.context.provider ?? executed.variant,
        },
        data,
      };
    },
  },
  Mutation: {
    ReactorySQLInsert: async (obj: any, params: any): Promise<SQLInsertResult> => {
      throw new ApiError('SQL inserts are not supported through this resolver');
    },
    ReactorySQLUpdate: async (obj: any, params: any): Promise<SQLUpdateResult> => {
      throw new ApiError('SQL updates are not supported through this resolver');
    },
    ReactorySQLDelete: (obj: any, params: any) => {
      throw new ApiError('SQL deletes are not supported through this resolver');
    },
  },
};

export default ReactorySQLResolver;
