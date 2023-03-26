import { Reactory } from "@reactory/server-core/types/reactory";


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

