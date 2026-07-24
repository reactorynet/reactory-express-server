import sql from 'mssql';
import Reactory from '@reactorynet/reactory-core';
import { resolveConnectionSettings } from '../connections';
import { IReactoryConnectionProvider } from '../types';

/**
 * Connection factory for Microsoft SQL Server connections declared as client
 * settings (`settingType: 'connection'`, `variant: 'mssql'`). Pools are cached
 * per connectionId; the cached value is the connect() promise so concurrent
 * callers share one pool.
 */
class MSSQLConnectionFactory implements IReactoryConnectionProvider<sql.ConnectionPool> {
  readonly variant = 'mssql' as const;

  private static instance: MSSQLConnectionFactory;

  private pools: Map<string, Promise<sql.ConnectionPool>> = new Map();

  public static getInstance(): MSSQLConnectionFactory {
    if (!MSSQLConnectionFactory.instance) {
      MSSQLConnectionFactory.instance = new MSSQLConnectionFactory();
    }
    return MSSQLConnectionFactory.instance;
  }

  public async getConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<sql.ConnectionPool> {
    if (!this.pools.has(connectionId)) {
      const settings = resolveConnectionSettings(connectionId, context, 'mssql');
      const config: sql.config = {
        server: settings.host || 'localhost',
        port: settings.port || 1433,
        database: settings.database,
        user: settings.username,
        password: settings.password,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          ...settings.options,
        },
      };
      const pending = new sql.ConnectionPool(config)
        .connect()
        .catch((error) => {
          this.pools.delete(connectionId);
          throw error;
        });
      this.pools.set(connectionId, pending);
    }
    return this.pools.get(connectionId);
  }

  public async testConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    const pool = await this.getConnection(connectionId, context);
    await pool.request().query('SELECT 1 AS ok');
    return true;
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const pending = this.pools.get(connectionId);
    if (!pending) return;
    this.pools.delete(connectionId);
    const pool = await pending.catch(() => null);
    if (pool) await pool.close();
  }

  public async closeAll(): Promise<void> {
    const ids = Array.from(this.pools.keys());
    await Promise.all(ids.map((id) => this.closeConnection(id)));
  }
}

export default MSSQLConnectionFactory;
