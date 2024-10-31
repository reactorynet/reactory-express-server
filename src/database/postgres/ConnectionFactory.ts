import ApiError from '@reactory/server-core/exceptions';
import Postgres from 'postgres'


class ConnectionFactory {
  private static instance: ConnectionFactory;
  private static connection: Postgres.Sql<{}>;

  private constructor() {
    ConnectionFactory.connection = Postgres({
      host: process.env.REACTORY_POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_POSTGRES_PORT || '5432'),
      username: process.env.REACTORY_POSTGRES_USER || 'reactory',
      password: process.env.REACTORY_POSTGRES_PASSWORD || 'reactory',
      database: process.env.REACTORY_POSTGRES_DB || 'reactory',      
    });
  }

  public static getInstance(): ConnectionFactory {
    if (!ConnectionFactory.instance) {
      ConnectionFactory.instance = new ConnectionFactory();
    }
    return ConnectionFactory.instance;
  }

  public getDefaultConnection(): Postgres.Sql<{}> {
    return ConnectionFactory.connection;
  }

  public static getConnectionForContext(connectionId: string, context: Reactory.Server.IReactoryContext): Postgres.Sql<{}> {
    if (!context.partner) throw new ApiError('Cannot get a connection without an active partner');

    const setting = context.partner.getSetting<{
      host: string;
      username: string;
      database: string;
      password: string;
      port: number;
      connectionLimit: number;
    }>(connectionId);


    if (!setting || !setting.data) {
      throw new ApiError(`Connection settings not found for ${connectionId}. Please check client settings for ${context.partner.name} (key ${context.partner.key})`);
    }

    const {
      database,
      host,
      port,
      password,
      username
    } = setting.data;

    return Postgres({
      host,
      port,
      username,
      password,
      database,
    });
  }
}

export default ConnectionFactory;