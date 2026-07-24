
import Reactory from '@reactorynet/reactory-core';
import ApiError from '@reactory/server-core/exceptions';
import mysql from './mysql';
import postgres from './postgres';
import MongoConnectionFactory from './mongo/ConnectionFactory';
import MySQLConnectionFactory from './mysql/ConnectionFactory';
import PostgresConnectionFactory from './postgres/ConnectionFactory';
import MSSQLConnectionFactory from './mssql/ConnectionFactory';
import DatabricksConnectionFactory from './databricks/ConnectionFactory';
import { resolveConnectionSettings, SUPPORTED_VARIANTS } from './connections';
import { IReactoryConnectionProvider, ReactoryDatabaseVariant } from './types';

/**
 * Returns the connection factory provider for a database variant. Every
 * variant supported by the core application (mongo, mysql, postgres, mssql,
 * databricks) has a factory; unknown variants throw.
 */
export const getConnectionFactory = (
  variant: ReactoryDatabaseVariant,
): IReactoryConnectionProvider<any> => {
  switch (variant) {
    case 'mongo': return MongoConnectionFactory.getInstance();
    case 'mysql': return MySQLConnectionFactory.getInstance();
    case 'postgres': return PostgresConnectionFactory.getInstance();
    case 'mssql': return MSSQLConnectionFactory.getInstance();
    case 'databricks': return DatabricksConnectionFactory.getInstance();
    default:
      throw new ApiError(
        `No connection factory registered for database variant '${variant}'. Supported variants: ${SUPPORTED_VARIANTS.join(', ')}`,
      );
  }
};

/**
 * Resolves a connection setting from the active partner and returns the
 * driver-native connection handle from the matching factory. The handle type
 * depends on the setting's variant: MongoClient (mongo), mysql.Pool (mysql),
 * postgres.Sql (postgres), sql.ConnectionPool (mssql), DBSQLClient (databricks).
 */
export const getConnectionForContext = async (
  connectionId: string,
  context: Reactory.Server.IReactoryContext,
): Promise<any> => {
  const settings = resolveConnectionSettings(connectionId, context);
  return getConnectionFactory(settings.variant).getConnection(connectionId, context);
};

export { resolveConnectionSettings, SUPPORTED_VARIANTS } from './connections';
export {
  MongoConnectionFactory,
  MySQLConnectionFactory,
  PostgresConnectionFactory,
  MSSQLConnectionFactory,
  DatabricksConnectionFactory,
};

export default {
  mysql,
  postgres,
};
