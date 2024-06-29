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

export type PostgresTableOptions = Options<PostgresOptions & { table: string, columns: Column[] }>;
