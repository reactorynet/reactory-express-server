import { MongoClient, Db } from 'mongodb';
import Reactory from '@reactorynet/reactory-core';
import { resolveConnectionSettings } from '../connections';
import { IDatabaseConnectionSettings, IReactoryConnectionProvider } from '../types';

const buildMongoUrl = (settings: IDatabaseConnectionSettings): string => {
  if (settings.url) return settings.url;
  const host = settings.host || 'localhost';
  const port = settings.port || 27017;
  const auth = settings.username
    ? `${encodeURIComponent(settings.username)}:${encodeURIComponent(settings.password || '')}@`
    : '';
  return `mongodb://${auth}${host}:${port}/${settings.database || ''}`;
};

/**
 * Connection factory for MongoDB connections declared as client settings
 * (`settingType: 'connection'`, `variant: 'mongo'`). Clients are cached per
 * connectionId; the cached value is the connect() promise so concurrent
 * callers share one client.
 */
class MongoConnectionFactory implements IReactoryConnectionProvider<MongoClient> {
  readonly variant = 'mongo' as const;

  private static instance: MongoConnectionFactory;

  private clients: Map<string, Promise<MongoClient>> = new Map();

  public static getInstance(): MongoConnectionFactory {
    if (!MongoConnectionFactory.instance) {
      MongoConnectionFactory.instance = new MongoConnectionFactory();
    }
    return MongoConnectionFactory.instance;
  }

  public async getConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<MongoClient> {
    if (!this.clients.has(connectionId)) {
      const settings = resolveConnectionSettings(connectionId, context, 'mongo');
      const pending = new MongoClient(buildMongoUrl(settings), { ...settings.options })
        .connect()
        .catch((error) => {
          this.clients.delete(connectionId);
          throw error;
        });
      this.clients.set(connectionId, pending);
    }
    return this.clients.get(connectionId);
  }

  /**
   * Convenience accessor returning the Db for the database named in the
   * connection settings.
   */
  public async getDb(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<Db> {
    const settings = resolveConnectionSettings(connectionId, context, 'mongo');
    const client = await this.getConnection(connectionId, context);
    return client.db(settings.database);
  }

  public async testConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    const client = await this.getConnection(connectionId, context);
    await client.db('admin').command({ ping: 1 });
    return true;
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const pending = this.clients.get(connectionId);
    if (!pending) return;
    this.clients.delete(connectionId);
    const client = await pending.catch(() => null);
    if (client) await client.close();
  }

  public async closeAll(): Promise<void> {
    const ids = Array.from(this.clients.keys());
    await Promise.all(ids.map((id) => this.closeConnection(id)));
  }
}

export default MongoConnectionFactory;
