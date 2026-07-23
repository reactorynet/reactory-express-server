import mysql from 'mysql';
import Reactory from '@reactorynet/reactory-core';
import { resolveConnectionSettings } from '../connections';
import { IDatabaseConnectionSettings, IReactoryConnectionProvider } from '../types';

/**
 * Connection factory for MySQL connections declared as client settings
 * (`settingType: 'connection'`, `variant: 'mysql'`). Pools are cached per
 * connectionId — unlike the legacy module-level pool in mysql.ts, two
 * different connectionIds no longer share (and clobber) one pool.
 */
class MySQLConnectionFactory implements IReactoryConnectionProvider<mysql.Pool> {
  readonly variant = 'mysql' as const;

  private static instance: MySQLConnectionFactory;

  private pools: Map<string, mysql.Pool> = new Map();

  public static getInstance(): MySQLConnectionFactory {
    if (!MySQLConnectionFactory.instance) {
      MySQLConnectionFactory.instance = new MySQLConnectionFactory();
    }
    return MySQLConnectionFactory.instance;
  }

  /**
   * Creates (or returns the cached) pool for pre-resolved connection
   * settings. Used by the legacy mysql.ts getConnection path, which resolves
   * settings with its own defaults, as well as by getConnection below.
   */
  public getPoolForSettings(
    connectionId: string,
    settings: Partial<IDatabaseConnectionSettings> & { user?: string; connectionLimit?: number },
  ): mysql.Pool {
    if (!this.pools.has(connectionId)) {
      const pool = mysql.createPool({
        connectionLimit: settings.connectionLimit || settings.options?.connectionLimit || 100,
        host: settings.host || 'localhost',
        port: settings.port || 3306,
        user: settings.username || settings.user || 'reactory',
        password: settings.password || '',
        database: settings.database,
        charset: 'utf8mb4',
        ...settings.options,
      });
      this.pools.set(connectionId, pool);
    }
    return this.pools.get(connectionId);
  }

  public async getConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<mysql.Pool> {
    if (!this.pools.has(connectionId)) {
      const settings = resolveConnectionSettings(connectionId, context, 'mysql');
      this.getPoolForSettings(connectionId, settings);
    }
    return this.pools.get(connectionId);
  }

  public async testConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    const pool = await this.getConnection(connectionId, context);
    return new Promise((resolve, reject) => {
      pool.query('SELECT 1 + 1 AS solution', (error) => {
        if (error) reject(error);
        else resolve(true);
      });
    });
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (!pool) return;
    this.pools.delete(connectionId);
    await new Promise<void>((resolve, reject) => {
      pool.end((error) => (error ? reject(error) : resolve()));
    });
  }

  public async closeAll(): Promise<void> {
    const ids = Array.from(this.pools.keys());
    await Promise.all(ids.map((id) => this.closeConnection(id)));
  }
}

export default MySQLConnectionFactory;
