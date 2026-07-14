import Reactory from '@reactorynet/reactory-core';
import { Client } from '@elastic/elasticsearch';
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
 * ElasticSearch backend. Maps the provider-agnostic operations onto the
 * ElasticSearch v8 client:
 *  - `search` builds a match_all / multi_match / simple_query_string query for a
 *    free-text string, or a bool query (must + filter) for a structured query,
 *  - `index` uses the bulk API keyed by each document's `id` (when present),
 *  - `deleteIndex` deletes the index, tolerating a 404.
 */
export class ElasticSearchProvider implements ISearchProvider {
  readonly id = 'elasticsearch';

  private client: Client;
  private context: Reactory.Server.IReactoryContext;

  constructor(config: SearchProviderConfig, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.client = new Client(ElasticSearchProvider.buildClientOptions(config));
  }

  static buildClientOptions(config: SearchProviderConfig): Record<string, any> {
    const node =
      config.nodes ||
      config.host ||
      process.env.ELASTICSEARCH_NODE ||
      process.env.ELASTICSEARCH_HOST ||
      'http://localhost:9200';

    const options: Record<string, any> = Array.isArray(node)
      ? { nodes: node }
      : { node };

    const apiKey = config.apiKey || process.env.ELASTICSEARCH_API_KEY;
    const username = config.username || process.env.ELASTICSEARCH_USERNAME;
    const password = config.password || process.env.ELASTICSEARCH_PASSWORD;

    if (apiKey) {
      options.auth = { apiKey };
    } else if (username && password) {
      options.auth = { username, password };
    }

    return { ...options, ...(config.options || {}) };
  }

  private static normaliseTotal(total: any): number {
    if (typeof total === 'number') return total;
    if (total && typeof total.value === 'number') return total.value;
    return 0;
  }

  /** Build the free-text query clause used for a raw string search. */
  private static buildTextQuery(filter: string, fields?: string[]): Record<string, any> {
    if (!filter || filter.trim().length === 0) {
      return { match_all: {} };
    }
    if (fields && fields.length > 0) {
      return { multi_match: { query: filter, fields } };
    }
    return { simple_query_string: { query: filter } };
  }

  /** Translate a single structured filter into an ElasticSearch clause. */
  private static buildFilterClause(filter: SearchFilter): Record<string, any> | null {
    const { field, op = 'eq', value } = filter;
    switch (op) {
      case 'eq':
        return { term: { [field]: value } };
      case 'ne':
        return { bool: { must_not: { term: { [field]: value } } } };
      case 'gt':
        return { range: { [field]: { gt: value } } };
      case 'gte':
        return { range: { [field]: { gte: value } } };
      case 'lt':
        return { range: { [field]: { lt: value } } };
      case 'lte':
        return { range: { [field]: { lte: value } } };
      case 'in':
        return { terms: { [field]: Array.isArray(value) ? value : [value] } };
      case 'nin':
        return { bool: { must_not: { terms: { [field]: Array.isArray(value) ? value : [value] } } } };
      case 'exists':
        return value === false
          ? { bool: { must_not: { exists: { field } } } }
          : { exists: { field } };
      case 'contains':
        return { wildcard: { [field]: `*${value}*` } };
      default:
        return null;
    }
  }

  /** Compose an ElasticSearch bool query from a structured query. */
  private static buildStructuredQuery(query: SearchQuery): Record<string, any> {
    const filters = (query.filters || [])
      .map((f) => ElasticSearchProvider.buildFilterClause(f))
      .filter((c): c is Record<string, any> => !!c);

    const hasText = !!(query.q && query.q.trim().length > 0);
    const must = hasText
      ? [ElasticSearchProvider.buildTextQuery(query.q as string, query.fields)]
      : [];

    if (must.length === 0 && filters.length === 0) {
      return { match_all: {} };
    }

    return {
      bool: {
        ...(must.length > 0 ? { must } : {}),
        ...(filters.length > 0 ? { filter: filters } : {}),
      },
    };
  }

  async search<T>(
    index: string,
    filter: SearchInput,
    fields?: string[],
    limit?: number,
    offset?: number,
  ): Promise<Reactory.Service.ISearchResults<T>> {
    const structured = typeof filter !== 'string' ? (filter as SearchQuery) : null;
    const size = structured?.limit ?? limit ?? 20;
    const from = structured?.offset ?? offset ?? 0;

    const request: Record<string, any> = {
      index,
      from,
      size,
      query: structured
        ? ElasticSearchProvider.buildStructuredQuery(structured)
        : ElasticSearchProvider.buildTextQuery(filter as string, fields),
    };

    if (structured) {
      if (structured.sort && structured.sort.length > 0) {
        request.sort = structured.sort.map((s) => ({ [s.field]: { order: s.direction || 'asc' } }));
      }
      if (structured.select && structured.select.length > 0) {
        request._source = structured.select;
      }
      if (structured.highlight && structured.highlight.length > 0) {
        request.highlight = {
          fields: structured.highlight.reduce(
            (acc, f) => ({ ...acc, [f]: {} }),
            {} as Record<string, any>,
          ),
        };
      }
    }

    const response: any = await this.client.search(request);

    const hits = response?.hits?.hits ?? [];
    return {
      limit: size,
      offset: from,
      total: ElasticSearchProvider.normaliseTotal(response?.hits?.total),
      results: hits.map((hit: any) => hit._source as T),
    };
  }

  async index<T>(index: string, data: T[]): Promise<Reactory.Service.ISearchIndexResult> {
    if (!data || data.length === 0) {
      return { id: index, success: true };
    }
    try {
      // ElasticSearch caps the bulk request body (http.max_content_length,
      // 100mb by default). Split large document sets into byte/count-bounded
      // batches so cataloguing thousands of files indexes reliably.
      const batches = ElasticSearchProvider.chunkForIndexing(data as any[]);
      for (const batch of batches) {
        const operations = batch.flatMap((doc: any) => {
          const action =
            doc && doc.id !== undefined && doc.id !== null
              ? { index: { _id: String(doc.id) } }
              : { index: {} };
          return [action, doc];
        });

        const response: any = await this.client.bulk({ index, operations, refresh: false });

        if (response?.errors) {
          const firstError = (response.items || [])
            .map((item: any) => item.index?.error?.reason || item.create?.error?.reason)
            .find(Boolean);
          this.context.error(`ElasticSearch bulk index reported errors: ${firstError || 'unknown'}`);
          return { id: index, success: false, error: firstError || 'bulk index errors' };
        }
      }

      return { id: index, success: true };
    } catch (ex) {
      this.context.error(ex.message);
      return { id: index, success: false, error: ex.message };
    }
  }

  /** Batch documents to stay under the bulk request body size limit. */
  private static readonly MAX_BATCH_BYTES = 40 * 1024 * 1024; // 40 MiB
  private static readonly MAX_BATCH_DOCS = 1000;

  private static chunkForIndexing<T>(data: T[]): T[][] {
    const batches: T[][] = [];
    let current: T[] = [];
    let currentBytes = 0;
    for (const doc of data) {
      const size = Buffer.byteLength(JSON.stringify(doc ?? {}), 'utf8');
      const exceeds =
        current.length > 0 &&
        (currentBytes + size > ElasticSearchProvider.MAX_BATCH_BYTES ||
          current.length >= ElasticSearchProvider.MAX_BATCH_DOCS);
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

  async createIndex(
    index: string,
    config?: IndexConfig,
  ): Promise<Reactory.Service.ISearchIndexResult> {
    try {
      const body: Record<string, any> = { index };
      const properties = ElasticSearchProvider.buildProperties(config);
      if (properties) body.mappings = { properties };
      // Tolerate 400 (resource_already_exists) so createIndex is idempotent.
      await this.client.indices.create(body, { ignore: [400] });
      return { id: index, success: true };
    } catch (ex) {
      this.context.error(`ElasticSearch createIndex failed for ${index}: ${ex.message}`);
      return { id: index, success: false, error: ex.message };
    }
  }

  /**
   * Build a mappings `properties` object from index attributes. Filterable and
   * sortable fields are mapped as `keyword`; searchable fields as `text`. Fields
   * that are both searchable and filter/sortable use a `text` field with a
   * `keyword` sub-field. ElasticSearch has no first-class "searchable
   * attributes" concept, so this is a pragmatic best-effort mapping.
   */
  private static buildProperties(config?: IndexAttributes): Record<string, any> | null {
    if (!config) return null;
    const searchable = new Set(config.searchableAttributes || []);
    const exact = new Set([
      ...(config.filterableAttributes || []),
      ...(config.sortableAttributes || []),
    ]);
    if (searchable.size === 0 && exact.size === 0) return null;

    const properties: Record<string, any> = {};
    for (const field of searchable) {
      properties[field] = exact.has(field)
        ? { type: 'text', fields: { keyword: { type: 'keyword' } } }
        : { type: 'text' };
    }
    for (const field of exact) {
      if (!properties[field]) properties[field] = { type: 'keyword' };
    }
    return properties;
  }

  async configureIndex(index: string, attributes: IndexAttributes): Promise<boolean> {
    const properties = ElasticSearchProvider.buildProperties(attributes);
    if (!properties) return true;
    try {
      await this.client.indices.putMapping({ index, properties });
      return true;
    } catch (ex) {
      this.context.error(`ElasticSearch configureIndex failed for ${index}: ${ex.message}`);
      return false;
    }
  }

  async deleteDocuments(
    index: string,
    ids: Array<string | number>,
  ): Promise<Reactory.Service.ISearchIndexResult> {
    if (!ids || ids.length === 0) return { id: index, success: true };
    try {
      const operations = ids.map((id) => ({ delete: { _id: String(id) } }));
      const response: any = await this.client.bulk({ index, operations, refresh: false });
      if (response?.errors) {
        const firstError = (response.items || [])
          .map((item: any) => item.delete?.error?.reason)
          .find(Boolean);
        // A "not_found" result for a missing id is reported without `errors`,
        // so reaching here means a genuine failure.
        this.context.error(`ElasticSearch deleteDocuments reported errors: ${firstError || 'unknown'}`);
        return { id: index, success: false, error: firstError || 'bulk delete errors' };
      }
      return { id: index, success: true };
    } catch (ex) {
      this.context.error(`ElasticSearch deleteDocuments failed for ${index}: ${ex.message}`);
      return { id: index, success: false, error: ex.message };
    }
  }

  async count(index: string, query?: SearchInput): Promise<number> {
    try {
      let esQuery: Record<string, any> | undefined;
      if (query !== undefined) {
        esQuery =
          typeof query === 'string'
            ? ElasticSearchProvider.buildTextQuery(query, undefined)
            : ElasticSearchProvider.buildStructuredQuery(query as SearchQuery);
      }
      const response: any = await this.client.count(
        esQuery ? { index, query: esQuery } : { index },
      );
      return typeof response?.count === 'number' ? response.count : 0;
    } catch (ex) {
      this.context.error(`ElasticSearch count failed for ${index}: ${ex.message}`);
      return 0;
    }
  }

  async deleteIndex(index: string): Promise<boolean> {
    try {
      await this.client.indices.delete({ index }, { ignore: [404] });
      return true;
    } catch (ex) {
      this.context.error(`ElasticSearch deleteIndex failed for ${index}: ${ex.message}`);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.ping();
    } catch (ex) {
      this.context.error(`ElasticSearch health check failed: ${ex.message}`);
      return false;
    }
  }
}

export default ElasticSearchProvider;
