import { service } from '@reactory/server-core/application/decorators';
import Reactory from '@reactorynet/reactory-core';
import {
  SearchIndexInfo,
  IndexAttributes,
  IndexConfig,
  IReactorySearchServiceExt,
  ISearchProvider,
  SearchInput,
  SearchProviderConfig,
} from './search/types';
import { createSearchProvider, DEFAULT_SEARCH_PROVIDER } from './search/providers';

/**
 * ReactorySearchService is a thin, backend-agnostic facade over a pluggable
 * search provider (see ./search). The backend is selected by the
 * `REACTORY_SEARCH_PROVIDER` environment variable and defaults to MeiliSearch,
 * which also drives local development.
 *
 * The original public surface (`search`, `index`, `deleteIndex` and the service
 * lifecycle methods) is unchanged, so existing callers - and the
 * `Reactory.Service.ISearchService` contract - continue to work exactly as
 * before. The service additionally implements the richer
 * `IReactorySearchServiceExt` contract (index management, structured queries,
 * document delete and count); each extended capability is guarded so a provider
 * that does not implement it fails with a clear, actionable error rather than a
 * cryptic `undefined is not a function`.
 */
@service({
  id: 'core.ReactorySearchService@1.0.0',
  description: 'Reactory Search Service',
  name: 'ReactorySearchService',
  nameSpace: 'core',
  version: '1.0.0',
  serviceType: 'data',
  dependencies: [],
})
class ReactorySearchService implements IReactorySearchServiceExt {

  description?: string;
  tags?: string[];
  nameSpace: string;
  name: string;
  version: string;
  context: Reactory.Server.IReactoryContext;

  /** The active backend adapter. */
  provider: ISearchProvider;

  constructor(_: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.provider = createSearchProvider(
      process.env.REACTORY_SEARCH_PROVIDER || DEFAULT_SEARCH_PROVIDER,
      this.buildProviderConfig(),
      context,
    );
  }

  /**
   * Build provider configuration from the generic `REACTORY_SEARCH_*`
   * environment variables. Only defined values are included, so a provider's
   * own backend-specific variables (e.g. `MEILISEARCH_HOST`) still apply as a
   * fallback and the previous zero-config behaviour is preserved.
   */
  private buildProviderConfig(): SearchProviderConfig {
    const config: SearchProviderConfig = {};
    const {
      REACTORY_SEARCH_HOST,
      REACTORY_SEARCH_NODES,
      REACTORY_SEARCH_API_KEY,
      REACTORY_SEARCH_USERNAME,
      REACTORY_SEARCH_PASSWORD,
    } = process.env;

    if (REACTORY_SEARCH_HOST) config.host = REACTORY_SEARCH_HOST;
    if (REACTORY_SEARCH_NODES) {
      const nodes = REACTORY_SEARCH_NODES.split(',').map((n) => n.trim()).filter(Boolean);
      config.nodes = nodes.length > 1 ? nodes : nodes[0];
    }
    if (REACTORY_SEARCH_API_KEY) config.apiKey = REACTORY_SEARCH_API_KEY;
    if (REACTORY_SEARCH_USERNAME) config.username = REACTORY_SEARCH_USERNAME;
    if (REACTORY_SEARCH_PASSWORD) config.password = REACTORY_SEARCH_PASSWORD;

    return config;
  }

  /** Guard: an index name is required for every operation. */
  private assertIndex(index: string, operation: string): void {
    if (!index || typeof index !== 'string' || index.trim().length === 0) {
      throw new Error(`ReactorySearchService.${operation}: a non-empty index name is required`);
    }
  }

  /**
   * Guard: the active provider must implement the requested optional capability.
   * Returns the bound method so callers can invoke it directly.
   */
  private requireCapability<K extends keyof ISearchProvider>(
    capability: K,
  ): NonNullable<ISearchProvider[K]> {
    const fn = this.provider[capability];
    if (typeof fn !== 'function') {
      throw new Error(
        `Search provider '${this.provider.id}' does not support '${String(capability)}'`,
      );
    }
    return (fn as any).bind(this.provider);
  }

  /** Swap the active provider (used by tests and advanced configuration). */
  setProvider(provider: ISearchProvider): void {
    this.provider = provider;
  }

  /** Returns the active provider. */
  getProvider(): ISearchProvider {
    return this.provider;
  }

  async search<T>(
    index: string,
    filter: SearchInput,
    fields?: string[],
    limit?: number,
    offset?: number,
  ): Promise<Reactory.Service.ISearchResults<T>> {
    this.assertIndex(index, 'search');
    return this.provider.search<T>(index, filter, fields, limit, offset);
  }

  async index<T>(index: string, data: T[]): Promise<Reactory.Service.ISearchIndexResult> {
    this.assertIndex(index, 'index');
    if (!Array.isArray(data)) {
      return { id: index, success: false, error: 'index: data must be an array of documents' };
    }
    return this.provider.index<T>(index, data);
  }

  async deleteIndex<T>(index: string): Promise<boolean> {
    this.assertIndex(index, 'deleteIndex');
    return this.provider.deleteIndex(index);
  }

  async createIndex(
    index: string,
    config?: IndexConfig,
  ): Promise<Reactory.Service.ISearchIndexResult> {
    this.assertIndex(index, 'createIndex');
    const createIndex = this.requireCapability('createIndex');
    return createIndex(index, config);
  }

  async configureIndex(index: string, attributes: IndexAttributes): Promise<boolean> {
    this.assertIndex(index, 'configureIndex');
    const configureIndex = this.requireCapability('configureIndex');
    return configureIndex(index, attributes);
  }

  async deleteDocuments(
    index: string,
    ids: Array<string | number>,
  ): Promise<Reactory.Service.ISearchIndexResult> {
    this.assertIndex(index, 'deleteDocuments');
    if (!Array.isArray(ids)) {
      return { id: index, success: false, error: 'deleteDocuments: ids must be an array' };
    }
    const deleteDocuments = this.requireCapability('deleteDocuments');
    return deleteDocuments(index, ids);
  }

  async count(index: string, query?: SearchInput): Promise<number> {
    this.assertIndex(index, 'count');
    const count = this.requireCapability('count');
    return count(index, query);
  }

  /** Enumerates the backend's indexes (raw listing — curate before exposing to agents). */
  async listIndexes(): Promise<SearchIndexInfo[]> {
    const listIndexes = this.requireCapability('listIndexes');
    return listIndexes();
  }

  /** Best-effort stats for one index: existence + document count. */
  async getIndexStats(index: string): Promise<{ name: string; exists: boolean; documentCount?: number }> {
    try {
      const documentCount = await this.count(index);
      return { name: index, exists: true, documentCount };
    } catch (err) {
      this.context.warn?.(`getIndexStats(${index}) failed: ${(err as Error).message}`);
      return { name: index, exists: false };
    }
  }

  async onStartup(): Promise<void> {
    // Optional connectivity probe; never throws so startup is unaffected when
    // the search backend is not yet reachable.
    if (typeof this.provider.healthCheck === 'function') {
      try {
        const healthy = await this.provider.healthCheck();
        if (!healthy) {
          this.context.warn?.(
            `Search provider '${this.provider.id}' reported an unhealthy status on startup`,
          );
        }
      } catch (ex) {
        this.context.warn?.(`Search provider health check failed: ${ex.message}`);
      }
    }
    return;
  }

  toString?(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}${includeVersion ? `@${this.version}` : ''}`;
  }
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): void {
    this.context = executionContext;
  }
}

export default ReactorySearchService;
