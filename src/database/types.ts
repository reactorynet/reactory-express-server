import Reactory from '@reactorynet/reactory-core';

/**
 * Database variants for which the core application provides
 * connection factory providers. Mirrors the variants supported by the
 * reactory-reactor AI data macros so a single client-config connection
 * setting serves both.
 */
export type ReactoryDatabaseVariant = 'mongo' | 'mysql' | 'postgres' | 'mssql' | 'databricks';

/**
 * Shape of the `data` block of a client setting with
 * `settingType: 'connection'`. Authored per client in
 * `src/data/clientConfigs/<client>/settings` (TS or YAML) — see
 * `clientConfigs/reactory/settings/settings.ts` for the canonical example.
 */
export interface IDatabaseConnectionSettings {
  variant: ReactoryDatabaseVariant;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  /** Full connection URL override (e.g. mongodb+srv://...). Takes precedence over host/port. */
  url?: string;
  /** Databricks: SQL warehouse HTTP path (e.g. /sql/1.0/warehouses/<id>) */
  path?: string;
  /** Databricks: personal access / OAuth token */
  token?: string;
  /** Driver-specific options passed through to the underlying client */
  options?: Record<string, any>;
}

/**
 * Common contract implemented by every connection factory in
 * `src/database/<variant>/ConnectionFactory.ts`. `TConnection` is the
 * driver-native handle (pool/client) — callers use the driver API directly.
 */
export interface IReactoryConnectionProvider<TConnection = unknown> {
  variant: ReactoryDatabaseVariant;
  getConnection(connectionId: string, context: Reactory.Server.IReactoryContext): Promise<TConnection>;
  testConnection(connectionId: string, context: Reactory.Server.IReactoryContext): Promise<boolean>;
  closeConnection(connectionId: string): Promise<void>;
  closeAll(): Promise<void>;
}

export enum Operator {
  EQ = " == ",
  GT = " > ",
  GTEQ = " >= ",
  LT = " < ",
  LTEQ = " <= ",
  BETWEEN = " BETWEEN ",
  LIKE = " LIKE ",
  IN = " IN "
}

export interface SQLColumn {
  field: string,
  type: string,
  title: string,
  widget: string
}

export interface SQLFilter {
  field: string,
  value: any,
  operator: Operator
}

export interface SQLContext {
  schema?: string,
  table?: string,
  commandText?: string,
  provider?: string,
  connectionId: string
}

export interface SQLFilter {
  field: string
  value: any
  operator: Operator
}

export interface PagingRequest {
  page: number
  pageSize: number
}

export interface PagingResult {
  total: number
  page: number
  hasNext: boolean
  pageSize: number
}

export interface SQLQueryResult {
  paging: PagingResult
  columns: SQLColumn[]
  filters: SQLFilter[]
  context: SQLContext
  data: any | any[]
}

export interface SQLInsertResult {
  columns: SQLColumn[]
  success: boolean
  recordsAffected: number
}

export interface SQLUpdateResult {
  success: boolean
  recordsAffected: number
}

export interface SQLDeleteResult {
  success: boolean
  recordsAffected: number
}

export interface SQLQuery {
  paging?: PagingRequest
  columns?: SQLColumn[]
  filters?: SQLFilter[]
  context: SQLContext,
}

export interface SQLInsert {
  columns: SQLColumn[]
  values: any[]
  context: SQLContext
}

export interface SQLUpdate {
  columns: SQLColumn[]
  values: any[]
  context: SQLContext
}

export interface SQLDelete {
  filter: SQLFilter[]
  context: SQLContext
}

export interface SQLParam {
  name: string
  type: string
  value: any
}

export interface SQLProcedure {
  name: String,
  parameters: SQLParam[]
}

export interface QueryStringResultWithCount {
  query: string,
  count: number
}

export interface QueryStringGenerator {
  fromQuery(queryCommand: SQLQuery): Promise<QueryStringResultWithCount>;
  fromInsert(insertCommand: SQLInsert): string;
  fromUpdate(updateCommand: SQLUpdate): string;
  fromDelete(deleteCommand: SQLDelete): string;
}


/**
 * IReactoryDatabase defines a set of abstracted functionality that can be implemented by a database provider.
 */
export interface IReactoryDatabase {
  Create: {
    [key: string]: (insertCommand: any | SQLInsert, request_context: Reactory.Server.IReactoryContext) => Promise<any>
  },
  Read: {
    [key: string]: (queryCommand: any | SQLQuery, request_context: Reactory.Server.IReactoryContext) => Promise<any>
  },
  Update: {
    [key: string]: SQLUpdate
  },
  Delete: {
    [key: string]: SQLDelete
  }
  StoredProcedures: {
    [key: string]: SQLProcedure
  },
  Install?: {
    [key: string]: (context: Reactory.Server.IReactoryContext) => Promise<any>
  },
}

