import Reactory from '@reactorynet/reactory-core';
import { MeiliSearch, TaskStatus } from 'meilisearch';
import {
  IndexAttributes,
  IndexConfig,
  ISearchProvider,
  SearchFilter,
  SearchInput,
  SearchProviderConfig,
  SearchQuery,
} from '../types';

/**
 * MeiliSearch backend. This is the default provider and the one used for local
 * development. The `search`/`index`/`deleteIndex` string-path behaviour is
 * identical to the original inline implementation of ReactorySearchService, so
 * existing indexes and callers are unaffected; structured queries and index
 * management are additive.
 */
export class MeiliSearchProvider implements ISearchProvider {
  readonly id = 'meilisearch';

  private client: MeiliSearch;
  private context: Reactory.Server.IReactoryContext;

  constructor(config: SearchProviderConfig, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.client = new MeiliSearch({
      host: config.host || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: config.apiKey || process.env.MEILISEARCH_MASTER_KEY || 'reactory-local',
      ...(config.options || {}),
    });
  }

  /** Format a scalar for a MeiliSearch filter expression. */
  private static formatValue(value: any): string {
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return `"${String(value).replace(/"/g, '\\"')}"`;
  }

  /** Translate a single structured filter into a MeiliSearch filter clause. */
  private static buildFilterClause(filter: SearchFilter): string | null {
    const { field, op = 'eq', value } = filter;
    switch (op) {
      case 'eq':
        return `${field} = ${MeiliSearchProvider.formatValue(value)}`;
      case 'ne':
        return `${field} != ${MeiliSearchProvider.formatValue(value)}`;
      case 'gt':
        return `${field} > ${MeiliSearchProvider.formatValue(value)}`;
      case 'gte':
        return `${field} >= ${MeiliSearchProvider.formatValue(value)}`;
      case 'lt':
        return `${field} < ${MeiliSearchProvider.formatValue(value)}`;
      case 'lte':
        return `${field} <= ${MeiliSearchProvider.formatValue(value)}`;
      case 'in':
      case 'nin': {
        const list = (Array.isArray(value) ? value : [value])
          .map((v) => MeiliSearchProvider.formatValue(v))
          .join(', ');
        return `${field} ${op === 'nin' ? 'NOT IN' : 'IN'} [${list}]`;
      }
      case 'exists':
        return value === false ? `${field} NOT EXISTS` : `${field} EXISTS`;
      case 'contains':
        // MeiliSearch has no universal CONTAINS operator across versions; an
        // equality clause is the safe, widely-supported approximation.
        return `${field} = ${MeiliSearchProvider.formatValue(value)}`;
      default:
        return null;
    }
  }

  /** Build a MeiliSearch filter array (AND-combined) from structured filters. */
  private static buildFilter(filters?: SearchFilter[]): string[] | undefined {
    if (!filters || filters.length === 0) return undefined;
    const clauses = filters
      .map((f) => MeiliSearchProvider.buildFilterClause(f))
      .filter((c): c is string => !!c);
    return clauses.length > 0 ? clauses : undefined;
  }

  /** Map a structured query onto MeiliSearch search parameters. */
  private static buildSearchParams(query: SearchQuery): Record<string, any> {
    const params: Record<string, any> = {};
    if (query.fields && query.fields.length > 0) params.attributesToSearchOn = query.fields;
    if (query.highlight && query.highlight.length > 0) params.attributesToHighlight = query.highlight;
    if (query.select && query.select.length > 0) params.attributesToRetrieve = query.select;
    const filter = MeiliSearchProvider.buildFilter(query.filters);
    if (filter) params.filter = filter;
    if (query.sort && query.sort.length > 0) {
      params.sort = query.sort.map((s) => `${s.field}:${s.direction || 'asc'}`);
    }
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.offset !== undefined) params.offset = query.offset;
    return params;
  }

  async search<T>(
    index: string,
    filter: SearchInput,
    fields?: string[],
    limit?: number,
    offset?: number,
  ): Promise<Reactory.Service.ISearchResults<T>> {
    const isStructured = typeof filter !== 'string';
    const term = isStructured ? (filter as SearchQuery).q ?? '' : (filter as string);
    const params = isStructured
      ? MeiliSearchProvider.buildSearchParams(filter as SearchQuery)
      : { attributesToHighlight: fields, limit, offset };

    const results = await this.client.index(index).search(term, params);
    return {
      limit: results.limit,
      offset: results.offset,
      total: results.estimatedTotalHits,
      results: results.hits.map((hit) => hit as T),
    };
  }

  /**
   * MeiliSearch rejects any request body above ~95 MiB. Large document sets
   * (e.g. cataloguing thousands of source files) must therefore be split into
   * multiple addDocuments calls, bounded by both cumulative byte size (well
   * under the hard limit, to leave room for HTTP overhead) and a document
   * count cap.
   */
  private static readonly MAX_BATCH_BYTES = 40 * 1024 * 1024; // 40 MiB
  private static readonly MAX_BATCH_DOCS = 1000;

  /** Split documents into batches that each stay under the Meili payload limit. */
  private static chunkForIndexing<T>(data: T[]): T[][] {
    const batches: T[][] = [];
    let current: T[] = [];
    let currentBytes = 0;
    for (const doc of data) {
      const size = Buffer.byteLength(JSON.stringify(doc ?? {}), 'utf8');
      const exceeds =
        current.length > 0 &&
        (currentBytes + size > MeiliSearchProvider.MAX_BATCH_BYTES ||
          current.length >= MeiliSearchProvider.MAX_BATCH_DOCS);
      if (exceeds) {
        batches.push(current);
        current = [];
        currentBytes = 0;
      }
      current.push(doc);
      currentBytes += size;
    }
    if (current.length) batches.push(current);
    return batches;
  }

  async index<T>(index: string, data: T[]): Promise<Reactory.Service.ISearchIndexResult> {
    if (!data || data.length === 0) {
      return { id: index, success: true };
    }
    const taskIsOkay = (status: TaskStatus): boolean =>
      status === TaskStatus.TASK_PROCESSING ||
      status === TaskStatus.TASK_SUCCEEDED ||
      status === TaskStatus.TASK_ENQUEUED;
    try {
      const batches = MeiliSearchProvider.chunkForIndexing(data as any[]);
      let indexUid: string = index;
      for (const batch of batches) {
        const task = await this.client.index(index).addDocuments(batch);
        indexUid = task.indexUid ?? indexUid;
        if (!taskIsOkay(task.status)) {
          return {
            id: indexUid,
            success: false,
            error: `addDocuments returned task status '${task.status}'`,
          };
        }
      }
      return { id: indexUid, success: true };
    } catch (ex) {
      this.context.error(ex.message);
      return { id: '', success: false, error: ex.message };
    }
  }

  async createIndex(
    index: string,
    config?: IndexConfig,
  ): Promise<Reactory.Service.ISearchIndexResult> {
    try {
      await this.client.createIndex(
        index,
        config?.primaryKey ? { primaryKey: config.primaryKey } : undefined,
      );
      if (config && (config.searchableAttributes || config.filterableAttributes || config.sortableAttributes)) {
        await this.configureIndex(index, config);
      }
      return { id: index, success: true };
    } catch (ex) {
      this.context.error(`MeiliSearch createIndex failed for ${index}: ${ex.message}`);
      return { id: index, success: false, error: ex.message };
    }
  }

  async configureIndex(index: string, attributes: IndexAttributes): Promise<boolean> {
    try {
      const settings: Record<string, any> = {};
      if (attributes.searchableAttributes) settings.searchableAttributes = attributes.searchableAttributes;
      if (attributes.filterableAttributes) settings.filterableAttributes = attributes.filterableAttributes;
      if (attributes.sortableAttributes) settings.sortableAttributes = attributes.sortableAttributes;
      if (Object.keys(settings).length === 0) return true;
      await this.client.index(index).updateSettings(settings);
      return true;
    } catch (ex) {
      this.context.error(`MeiliSearch configureIndex failed for ${index}: ${ex.message}`);
      return false;
    }
  }

  async deleteDocuments(
    index: string,
    ids: Array<string | number>,
  ): Promise<Reactory.Service.ISearchIndexResult> {
    try {
      await this.client.index(index).deleteDocuments(ids);
      return { id: index, success: true };
    } catch (ex) {
      this.context.error(`MeiliSearch deleteDocuments failed for ${index}: ${ex.message}`);
      return { id: index, success: false, error: ex.message };
    }
  }

  async count(index: string, query?: SearchInput): Promise<number> {
    const params: Record<string, any> =
      query && typeof query !== 'string'
        ? { ...MeiliSearchProvider.buildSearchParams(query as SearchQuery), limit: 0 }
        : { limit: 0 };
    const term = query && typeof query !== 'string' ? (query as SearchQuery).q ?? '' : (query as string) || '';
    const results = await this.client.index(index).search(term, params);
    return results.estimatedTotalHits ?? 0;
  }

  async deleteIndex(index: string): Promise<boolean> {
    await this.client.deleteIndexIfExists(index);
    return true;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health?.status === 'available';
    } catch (ex) {
      this.context.error(`MeiliSearch health check failed: ${ex.message}`);
      return false;
    }
  }
}

export default MeiliSearchProvider;
