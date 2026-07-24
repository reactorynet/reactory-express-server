import ApiError from '@reactory/server-core/exceptions';
import Postgres from 'postgres'
import Reactory from '@reactorynet/reactory-core';
import { resolveConnectionSettings } from '../connections';
import { IReactoryConnectionProvider } from '../types';

/**
 * Connection factory for PostgreSQL connections declared as client settings
 * (`settingType: 'connection'`, `variant: 'postgres'`). Connections are
 * cached per connectionId (postgres.js connects lazily, so creation is
 * synchronous and cheap, but each instance owns a socket pool — the cache
 * prevents a new pool per call).
 */
class ConnectionFactory implements IReactoryConnectionProvider<Postgres.Sql<{}>> {
  readonly variant = 'postgres' as const;

  private static instance: ConnectionFactory;
  private static connection: Postgres.Sql<{}>;

  private connections: Map<string, Postgres.Sql<{}>> = new Map();

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

  public async getConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<Postgres.Sql<{}>> {
    return ConnectionFactory.getConnectionForContext(connectionId, context);
  }

  public async testConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    const sql = await this.getConnection(connectionId, context);
    await sql`SELECT 1 AS ok`;
    return true;
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const sql = this.connections.get(connectionId);
    if (!sql) return;
    this.connections.delete(connectionId);
    await sql.end();
  }

  public async closeAll(): Promise<void> {
    const ids = Array.from(this.connections.keys());
    await Promise.all(ids.map((id) => this.closeConnection(id)));
  }

  public static getConnectionForContext(connectionId: string, context: Reactory.Server.IReactoryContext): Postgres.Sql<{}> {
    if (!context.partner) throw new ApiError('Cannot get a connection without an active partner');

    const instance = ConnectionFactory.getInstance();
    if (instance.connections.has(connectionId)) {
      return instance.connections.get(connectionId);
    }

    const {
      database,
      host,
      port,
      password,
      username,
      options,
    } = resolveConnectionSettings(connectionId, context, 'postgres');

    const connection = Postgres({
      host,
      port,
      username,
      password,
      database,
      ...options,
    });

    instance.connections.set(connectionId, connection);
    return connection;
  }
}

export default ConnectionFactory;
