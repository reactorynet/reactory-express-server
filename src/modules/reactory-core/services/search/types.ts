import Reactory from '@reactorynet/reactory-core';

/**
 * Identifiers for the built-in search backends.
 */
export type SearchProviderId = 'meilisearch' | 'elasticsearch';

/**
 * Provider-agnostic configuration. Individual providers read the subset of
 * fields relevant to them; anything else can be passed through `options`.
 */
export interface SearchProviderConfig {
  /** Primary host / node URL (e.g. http://localhost:7700). */
  host?: string;
  /** One or more node URLs (ElasticSearch cluster). Overrides `host` when set. */
  nodes?: string | string[];
  /** API key / master key. */
  apiKey?: string;
  /** Basic-auth username (ElasticSearch). */
  username?: string;
  /** Basic-auth password (ElasticSearch). */
  password?: string;
  /** Provider-specific escape hatch (passed to the underlying client). */
  options?: Record<string, any>;
}

/**
 * Comparison operators supported by a structured {@link SearchFilter}. Each
 * provider maps these onto its own filter/query DSL.
 */
export type SearchFilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'exists'
  | 'contains';

/**
 * A single structured filter clause. `op` defaults to `eq`. `value` is
 * interpreted per operator (`in`/`nin` expect an array, `exists` a boolean).
 */
export interface SearchFilter {
  field: string;
  op?: SearchFilterOperator;
  value?: any;
}

/** Sort directive; `direction` defaults to `asc`. */
export interface SearchSort {
  field: string;
  direction?: 'asc' | 'desc';
}

/**
 * Backend-agnostic structured query. Callers can pass this to `search`/`count`
 * instead of a raw string to express filtering, sorting, projection and
 * highlighting without coupling to a specific engine's DSL.
 */
export interface SearchQuery {
  /** Free-text query terms. Empty/absent means "match everything". */
  q?: string;
  /** Restrict the free-text match to these fields. */
  fields?: string[];
  /** Structured filters, combined with logical AND. */
  filters?: SearchFilter[];
  /** Sort directives, applied in order. */
  sort?: SearchSort[];
  /** Fields to return (source projection). */
  select?: string[];
  /** Fields to highlight in the response. */
  highlight?: string[];
  /** Max hits to return. */
  limit?: number;
  /** Hits to skip. */
  offset?: number;
}

/** A free-text string or a structured {@link SearchQuery}. */
export type SearchInput = string | SearchQuery;

/**
 * Per-index attribute configuration. Providers apply the subset they support:
 * MeiliSearch maps these onto index settings; ElasticSearch onto mappings.
 */
export interface IndexAttributes {
  /** Attributes that participate in full-text search. */
  searchableAttributes?: string[];
  /** Attributes that can be used in structured filters. */
  filterableAttributes?: string[];
  /** Attributes that can be sorted on. */
  sortableAttributes?: string[];
}

/** Options for creating an index. */
export interface IndexConfig extends IndexAttributes {
  /** Primary-key field used to de-duplicate documents (MeiliSearch). */
  primaryKey?: string;
}

/**
 * A search backend adapter. The three core operations mirror
 * `Reactory.Service.ISearchService` exactly so `ReactorySearchService` can
 * delegate to any provider without a translation layer. Providers may add
 * optional lifecycle and management helpers; the service guards each optional
 * capability before use.
 */
export interface ISearchProvider {
  /** Stable identifier of the backend (e.g. 'meilisearch'). */
  readonly id: SearchProviderId | string;

  /**
   * Full-text search over an index.
   * @param index index / collection name
   * @param filter free-text query string, or a structured {@link SearchQuery}
   * @param fields fields to restrict / highlight (ignored when `filter` is a SearchQuery)
   * @param limit  max hits to return (ignored when `filter` is a SearchQuery)
   * @param offset number of hits to skip (ignored when `filter` is a SearchQuery)
   */
  search<T>(
    index: string,
    filter: SearchInput,
    fields?: string[],
    limit?: number,
    offset?: number,
  ): Promise<Reactory.Service.ISearchResults<T>>;

  /** Add/replace documents in an index. */
  index<T>(index: string, data: T[]): Promise<Reactory.Service.ISearchIndexResult>;

  /** Delete an index if it exists. Resolves true when the index is absent afterwards. */
  deleteIndex(index: string): Promise<boolean>;

  /** Optional connectivity check used by the service on startup. */
  healthCheck?(): Promise<boolean>;

  /** Optional: create an index, applying `config` when supported. */
  createIndex?(
    index: string,
    config?: IndexConfig,
  ): Promise<Reactory.Service.ISearchIndexResult>;

  /** Optional: (re)configure searchable/filterable/sortable attributes. */
  configureIndex?(index: string, attributes: IndexAttributes): Promise<boolean>;

  /** Optional: delete specific documents by id. */
  deleteDocuments?(
    index: string,
    ids: Array<string | number>,
  ): Promise<Reactory.Service.ISearchIndexResult>;

  /** Optional: count documents matching an (optional) query. */
  count?(index: string, query?: SearchInput): Promise<number>;
}

/**
 * The extended search-service contract implemented by `ReactorySearchService`.
 *
 * It is a superset of the published `Reactory.Service.ISearchService`: every
 * existing caller keeps working unchanged, while callers that need index
 * management or structured queries can depend on this richer interface.
 * Kept local to the express-server so the shared `reactory-core` contract stays
 * stable; it can be upstreamed later without a breaking change.
 */
export interface IReactorySearchServiceExt extends Reactory.Service.ISearchService {
  /** Full-text or structured search. Widens the base `filter` to {@link SearchInput}. */
  search<T>(
    index: string,
    filter: SearchInput,
    fields?: string[],
    limit?: number,
    offset?: number,
  ): Promise<Reactory.Service.ISearchResults<T>>;

  /** Create an index, optionally applying attribute configuration. */
  createIndex(
    index: string,
    config?: IndexConfig,
  ): Promise<Reactory.Service.ISearchIndexResult>;

  /** (Re)configure searchable/filterable/sortable attributes of an index. */
  configureIndex(index: string, attributes: IndexAttributes): Promise<boolean>;

  /** Delete specific documents by id. */
  deleteDocuments(
    index: string,
    ids: Array<string | number>,
  ): Promise<Reactory.Service.ISearchIndexResult>;

  /** Count documents matching an optional query. */
  count(index: string, query?: SearchInput): Promise<number>;

  /** Returns the active provider. */
  getProvider(): ISearchProvider;

  /** Swap the active provider (tests / advanced configuration). */
  setProvider(provider: ISearchProvider): void;
}

/**
 * Provider constructor signature used by the factory/registry.
 */
export interface ISearchProviderConstructor {
  new (
    config: SearchProviderConfig,
    context: Reactory.Server.IReactoryContext,
  ): ISearchProvider;
}
