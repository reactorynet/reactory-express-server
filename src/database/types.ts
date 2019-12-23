

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
  title: string,
  widget: string
}

export interface SQLFilter {
  field: string,
  value: any,
  operator: Operator
}

export interface SQLContext {
  schema: string,
  table: string,
  commandText: string,
  provider: string
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
  paging: PagingRequest
  columns: SQLColumn[]
  filters: SQLFilter[]
  context: SQLContext
}

export interface SQLInsert {
  columns: SQLColumn[ ]
  values: any[  ]
  context: SQLContext
}

export interface SQLUpdate {
  columns: SQLColumn[  ]
  values: any[  ]
  context: SQLContext
}

export interface SQLDelete {
  columns: SQLColumn[  ]
  filter: SQLFilter[  ]
  context: SQLContext
}

export interface QueryStringGenerator {
  fromQuery(queryCommand: SQLQuery): string;
  fromInsert(insertCommand: SQLInsert): string;
  fromUpdate(updateCommand: SQLUpdate): string;
  fromDelete(deleteCommand: SQLDelete): string;
}

