import Reactory from '@reactorynet/reactory-core';
import ApiError from '@reactory/server-core/exceptions';
import { resolveConnectionSettings } from '../connections';
import { IDatabaseConnectionSettings, IReactoryConnectionProvider } from '../types';

/**
 * The @databricks/sql driver is an optional dependency — resolved lazily so
 * the server boots without it when no client declares a databricks connection.
 */
const loadDriver = (): any => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('@databricks/sql');
  } catch (error) {
    throw new ApiError(
      "The '@databricks/sql' driver is not installed. Run 'yarn add @databricks/sql' to enable databricks connections.",
    );
  }
};

const resolveDriverOptions = (settings: IDatabaseConnectionSettings) => {
  const host = (settings.host || '').replace(/^https?:\/\//, '');
  const path = settings.path || settings.options?.path;
  const token = settings.token || settings.password;

  if (!host || !path || !token) {
    throw new ApiError(
      "Databricks connections require 'host' (workspace hostname), 'path' (SQL warehouse HTTP path) and 'token' (or 'password') in the connection settings data.",
    );
  }

  return { host, path, token, options: settings.options };
};

/**
 * Connection factory for Databricks SQL warehouse connections declared as
 * client settings (`settingType: 'connection'`, `variant: 'databricks'`).
 *
 * Expected settings data:
 *   host: dbc-xxxxxxxx.cloud.databricks.com
 *   path: /sql/1.0/warehouses/<warehouse-id>
 *   token: <personal access token>   # or password:
 *
 * The connection handle is the driver's DBSQLClient; use executeQuery for the
 * common open-session/execute/fetch/close cycle.
 */
class DatabricksConnectionFactory implements IReactoryConnectionProvider<any> {
  readonly variant = 'databricks' as const;

  private static instance: DatabricksConnectionFactory;

  private clients: Map<string, Promise<any>> = new Map();

  public static getInstance(): DatabricksConnectionFactory {
    if (!DatabricksConnectionFactory.instance) {
      DatabricksConnectionFactory.instance = new DatabricksConnectionFactory();
    }
    return DatabricksConnectionFactory.instance;
  }

  public async getConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    if (!this.clients.has(connectionId)) {
      const settings = resolveConnectionSettings(connectionId, context, 'databricks');
      const { host, path, token } = resolveDriverOptions(settings);
      const { DBSQLClient } = loadDriver();
      const client = new DBSQLClient();
      const pending = client
        .connect({ host, path, token })
        .catch((error: Error) => {
          this.clients.delete(connectionId);
          throw error;
        });
      this.clients.set(connectionId, pending);
    }
    return this.clients.get(connectionId);
  }

  /**
   * Executes a single statement using a short-lived session and returns the
   * result rows.
   */
  public async executeQuery(
    connectionId: string,
    query: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<Record<string, any>[]> {
    const client = await this.getConnection(connectionId, context);
    const session = await client.openSession();
    try {
      const operation = await session.executeStatement(query, { runAsync: true });
      const rows = await operation.fetchAll();
      await operation.close();
      return rows as Record<string, any>[];
    } finally {
      await session.close();
    }
  }

  public async testConnection(
    connectionId: string,
    context: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    await this.executeQuery(connectionId, 'SELECT 1 AS ok', context);
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

export default DatabricksConnectionFactory;
