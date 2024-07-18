import Reactory from '@reactory/reactory-core';

export type Context = Reactory.Server.IReactoryContext;
export type Generator<TP, TC extends Context> = Reactory.Forms.ReactoryFormGeneratorService<TP, TC>;
export type Options<TP> = Reactory.Forms.IReactoryRelationDatabaseFormGeneratorOptions & TP;

export type PostgresConnectionCredentials = { 
  host: string, 
  port: number, 
  database: string, 
  username: string, 
  password: string 
}

export type PostgresOptions = Options<PostgresConnectionCredentials>;
type Column = Reactory.Forms.IReactoryDatabaseEntityColumn;

export type PostgresTableOptions = Options<{}>;

export interface PostgresTable {
  table_catalog: string, // "reactory",
  table_schema: string // "public",
  table_name: string // "reactory_audit",
  table_type: string // "BASE TABLE",
  self_referencing_column_name?: string, // null,
  reference_generation?: string,
  user_defined_type_catalog?: string,
  user_defined_type_schema?: string,
  user_defined_type_name?: string,
  is_insertable_into?: string | "NO" | "YES",
  is_typed?: string | "NO" | "YES",
  commit_action?: string,
}

export interface PostgresColumn {
  table_catalog: string,
  table_schema: string,
  table_name: string,
  column_name: string,
  ordinal_position: number,
  column_default: string,
  is_nullable: string,
  data_type: string,
  character_maximum_length?: number,
  character_octet_length?: number,
  numeric_precision?: number,
  numeric_precision_radix?: number,
  numeric_scale?: number,
  datetime_precision?: any,
  interval_type?: string,
  interval_precision?: number,
  character_set_catalog?: string,
  character_set_schema?: string,
  character_set_name?: string,
  collation_catalog?: string,
  collation_schema?: string,
  collation_name?: string,
  domain_catalog?: string,
  domain_schema?: string,
  domain_name?: string,
  udt_catalog: string,
  udt_schema: string,
  udt_name: string,
  scope_catalog?: string,
  scope_schema?: string,
  scope_name?: string,
  maximum_cardinality?: number,
  dtd_identifier: string,
  is_self_referencing: string,
  is_identity: string,
  identity_generation?: any,
  identity_start?: number,
  identity_increment?: number,
  identity_maximum?: number,
  identity_minimum?: number,
  identity_cycle: string,
  is_generated: string | "NEVER",
  generation_expression?: string,
  is_updatable: string | "YES" | "NO",
}