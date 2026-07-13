/**
 * SearchStep - Executes backend-agnostic search operations through the
 * `core.ReactorySearchService` facade (MeiliSearch, ElasticSearch, ...).
 *
 * Config shape (from YAML `inputs` JSON):
 *   operation:              "search"            (required — one of search, index, createIndex, deleteIndex)
 *   indexName:              "products"           (required — the index name)
 *   query:                  "search term"        (for search — the free-text query string)
 *   fields:                 [ "title", "body" ]  (for search — restrict the free-text match to these fields)
 *   documents:              [ { ... }, ... ]     (for index — documents to add/update)
 *   searchableAttributes:   [ "title", "body" ]  (for createIndex — attributes that can be searched)
 *   filterableAttributes:   [ "genre", "year" ]  (for createIndex — attributes used for filtering)
 *   sortableAttributes:     [ "price", "date" ]  (for createIndex — attributes used for sorting)
 *   filters:                [ { field, op, value } ]  (for search — structured, backend-agnostic filters)
 *   sort:                   [ { field, direction } ]  (for search — structured sort directives)
 *   limit:                  20                   (for search — maximum hits to return)
 *   offset:                 0                    (for search — offset for pagination)
 *
 * Output:
 *   search:      { hits, results, total, offset, limit }   (hits === results, for backward compatibility)
 *   index:       { id, success, error }
 *   createIndex: { id, success, error }
 *   deleteIndex: { deleted }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';
import {
  IReactorySearchServiceExt,
  SearchFilter,
  SearchQuery,
  SearchSort,
} from '@reactory/server-modules/reactory-core/services/search/types';

/** Valid search operations */
type SearchOperation = 'search' | 'index' | 'createIndex' | 'deleteIndex';

/**
 * Configuration interface for SearchStep
 */
export interface SearchStepConfig {
  /** The operation to perform */
  operation: SearchOperation;

  /** MeiliSearch index name */
  indexName: string;

  /** Free-text search query string (for search operation) */
  query?: string;

  /** Restrict the free-text match to these fields (for search) */
  fields?: string[];

  /** Documents to add/update (for index operation) */
  documents?: Record<string, any>[];

  /** Searchable attributes (for createIndex) */
  searchableAttributes?: string[];

  /** Filterable attributes (for createIndex) */
  filterableAttributes?: string[];

  /** Sortable attributes (for createIndex) */
  sortableAttributes?: string[];

  /** Structured, backend-agnostic filters (for search) */
  filters?: SearchFilter[];

  /** Structured sort directives (for search) */
  sort?: SearchSort[];

  /** Maximum number of hits to return (for search) */
  limit?: number;

  /** Offset for pagination (for search) */
  offset?: number;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for executing MeiliSearch operations within a YAML workflow
 */
export class SearchStep extends BaseYamlStep {
  public readonly stepType = 'search';

  /**
   * Execute the MeiliSearch step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as SearchStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot execute search operation',
        outputs: {},
        metadata: {},
      };
    }

    const resolvedIndexName = this.resolveTemplate(config.indexName, context);
    const resolvedQuery = config.query
      ? this.resolveTemplate(config.query, context)
      : undefined;
    const resolvedFilters: SearchFilter[] | undefined = config.filters
      ? (this.resolveParams(config.filters, context) as SearchFilter[])
      : undefined;
    const resolvedSort: SearchSort[] | undefined = config.sort
      ? (this.resolveParams(config.sort, context) as SearchSort[])
      : undefined;
    const resolvedDocuments = config.documents
      ? this.resolveParams(config.documents, context)
      : undefined;

    context.logger.info(
      `Executing search ${config.operation} on index "${resolvedIndexName}"`,
    );

    try {
      const searchService = this.getSearchService(context);

      if (!searchService) {
        return {
          success: false,
          error: 'Search service (core.ReactorySearchService) not available in the Reactory context',
          outputs: {},
          metadata: { indexName: resolvedIndexName, operation: config.operation },
        };
      }

      let result: any;

      switch (config.operation) {
        case 'search': {
          if (resolvedQuery === undefined) {
            return {
              success: false,
              error: 'query is required for search operation',
              outputs: {},
              metadata: { indexName: resolvedIndexName, operation: config.operation },
            };
          }

          // Build a backend-agnostic structured query so filters/sort/paging
          // work identically across MeiliSearch, ElasticSearch, etc.
          const query: SearchQuery = { q: resolvedQuery };
          if (config.fields) query.fields = config.fields;
          if (resolvedFilters) query.filters = resolvedFilters;
          if (resolvedSort) query.sort = resolvedSort;
          if (config.limit !== undefined) query.limit = config.limit;
          if (config.offset !== undefined) query.offset = config.offset;

          result = await searchService.search(resolvedIndexName, query);

          return {
            success: true,
            outputs: {
              // `hits` is retained as an alias of `results` for backward compatibility.
              hits: result.results || [],
              results: result.results || [],
              total: result.total || 0,
              offset: result.offset || 0,
              limit: result.limit || 0,
            },
            metadata: {
              indexName: resolvedIndexName,
              operation: config.operation,
              query: resolvedQuery,
              hitCount: result.results?.length || 0,
            },
          };
        }

        case 'index': {
          if (!resolvedDocuments || !Array.isArray(resolvedDocuments) || resolvedDocuments.length === 0) {
            return {
              success: false,
              error: 'documents is required for index operation and must be a non-empty array',
              outputs: {},
              metadata: { indexName: resolvedIndexName, operation: config.operation },
            };
          }

          result = await searchService.index(resolvedIndexName, resolvedDocuments);

          return {
            success: result.success !== false,
            error: result.error,
            outputs: {
              id: result.id ?? resolvedIndexName,
              success: result.success !== false,
              error: result.error,
            },
            metadata: {
              indexName: resolvedIndexName,
              operation: config.operation,
              documentCount: resolvedDocuments.length,
            },
          };
        }

        case 'createIndex': {
          // Attribute configuration is applied atomically by the facade's
          // createIndex when supported by the active provider.
          result = await searchService.createIndex(resolvedIndexName, {
            searchableAttributes: config.searchableAttributes,
            filterableAttributes: config.filterableAttributes,
            sortableAttributes: config.sortableAttributes,
          });

          return {
            success: result.success !== false,
            error: result.error,
            outputs: {
              id: result.id ?? resolvedIndexName,
              success: result.success !== false,
              error: result.error,
            },
            metadata: {
              indexName: resolvedIndexName,
              operation: config.operation,
              searchableAttributes: config.searchableAttributes || [],
              filterableAttributes: config.filterableAttributes || [],
              sortableAttributes: config.sortableAttributes || [],
            },
          };
        }

        case 'deleteIndex': {
          const deleted = await searchService.deleteIndex(resolvedIndexName);

          return {
            success: deleted,
            outputs: {
              deleted,
            },
            metadata: {
              indexName: resolvedIndexName,
              operation: config.operation,
            },
          };
        }

        default:
          return {
            success: false,
            error: `Unsupported search operation: "${config.operation}"`,
            outputs: {},
            metadata: { indexName: resolvedIndexName },
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`Search operation failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: {
          indexName: resolvedIndexName,
          operation: config.operation,
        },
      };
    }
  }

  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validOps: SearchOperation[] = ['search', 'index', 'createIndex', 'deleteIndex'];
    if (!config.operation || !validOps.includes(config.operation)) {
      errors.push(`operation is required and must be one of: ${validOps.join(', ')}`);
    }

    if (!config.indexName || typeof config.indexName !== 'string') {
      errors.push('indexName is required and must be a string');
    }

    // Operation-specific validation
    if (config.operation === 'search') {
      if (config.query === undefined || config.query === null) {
        errors.push('query is required for search operation');
      }
      if (config.limit !== undefined && (typeof config.limit !== 'number' || config.limit < 0)) {
        errors.push('limit must be a non-negative number');
      }
      if (config.offset !== undefined && (typeof config.offset !== 'number' || config.offset < 0)) {
        errors.push('offset must be a non-negative number');
      }
      if (config.filters !== undefined && !Array.isArray(config.filters)) {
        errors.push('filters must be an array of { field, op, value } objects');
      }
      if (config.sort !== undefined && !Array.isArray(config.sort)) {
        errors.push('sort must be an array of { field, direction } objects');
      }
      if (config.fields !== undefined && !Array.isArray(config.fields)) {
        errors.push('fields must be an array of strings');
      }
    }

    if (config.operation === 'index') {
      if (!config.documents || !Array.isArray(config.documents)) {
        errors.push('documents is required for index operation and must be an array');
      } else if (config.documents.length === 0) {
        warnings.push('documents array is empty — no documents will be indexed');
      }
    }

    if (config.operation === 'createIndex') {
      if (config.searchableAttributes && !Array.isArray(config.searchableAttributes)) {
        errors.push('searchableAttributes must be an array of strings');
      }
      if (config.filterableAttributes && !Array.isArray(config.filterableAttributes)) {
        errors.push('filterableAttributes must be an array of strings');
      }
      if (config.sortableAttributes && !Array.isArray(config.sortableAttributes)) {
        errors.push('sortableAttributes must be an array of strings');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Resolve the MeiliSearch service from the Reactory context
   * @param context - Execution context
   * @returns MeiliSearch service or null
   */
  private getSearchService(context: StepExecutionContext): IReactorySearchServiceExt | null {
    try {
      const svc = context.reactoryContext.getService(
        'core.ReactorySearchService@1.0.0',
      ) as unknown as IReactorySearchServiceExt;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    return null;
  }

  /**
   * Deep-resolve template strings inside a params object
   * @param params - Parameters to resolve
   * @param context - Execution context
   * @returns Resolved parameters
   */
  private resolveParams(params: any, context: StepExecutionContext): any {
    if (typeof params === 'string') {
      return this.resolveTemplate(params, context);
    }
    if (Array.isArray(params)) {
      return params.map((p) => this.resolveParams(p, context));
    }
    if (params && typeof params === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveParams(value, context);
      }
      return resolved;
    }
    return params;
  }
}
