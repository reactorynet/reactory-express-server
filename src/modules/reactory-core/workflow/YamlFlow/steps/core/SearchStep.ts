/**
 * SearchStep - Executes MeiliSearch operations
 *
 * Config shape (from YAML `inputs` JSON):
 *   operation:              "search"            (required — one of search, index, createIndex, deleteIndex)
 *   indexName:              "products"           (required — the MeiliSearch index name)
 *   query:                  "search term"        (for search — the search query string)
 *   documents:              [ { ... }, ... ]     (for index — documents to add/update)
 *   searchableAttributes:   [ "title", "body" ]  (for createIndex — attributes that can be searched)
 *   filterableAttributes:   [ "genre", "year" ]  (for createIndex — attributes used for filtering)
 *   sortableAttributes:     [ "price", "date" ]  (for createIndex — attributes used for sorting)
 *   filters:                "genre = 'action'"   (for search — filter expression)
 *   limit:                  20                   (for search — maximum hits to return)
 *   offset:                 0                    (for search — offset for pagination)
 *
 * Output:
 *   search:      { hits, estimatedTotalHits, processingTimeMs }
 *   index:       { taskUid, status }
 *   createIndex: { taskUid, status }
 *   deleteIndex: { taskUid, status }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

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

  /** Search query string (for search operation) */
  query?: string;

  /** Documents to add/update (for index operation) */
  documents?: Record<string, any>[];

  /** Searchable attributes (for createIndex) */
  searchableAttributes?: string[];

  /** Filterable attributes (for createIndex) */
  filterableAttributes?: string[];

  /** Sortable attributes (for createIndex) */
  sortableAttributes?: string[];

  /** Filter expression (for search) */
  filters?: string;

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
    const resolvedFilters = config.filters
      ? this.resolveTemplate(config.filters, context)
      : undefined;
    const resolvedDocuments = config.documents
      ? this.resolveParams(config.documents, context)
      : undefined;

    context.logger.info(
      `Executing MeiliSearch ${config.operation} on index "${resolvedIndexName}"`,
    );

    try {
      const searchService = this.getSearchService(context);

      if (!searchService) {
        return {
          success: false,
          error: 'MeiliSearch service not available in the Reactory context',
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

          const searchParams: Record<string, any> = {};
          if (resolvedFilters) searchParams.filter = resolvedFilters;
          if (config.limit !== undefined) searchParams.limit = config.limit;
          if (config.offset !== undefined) searchParams.offset = config.offset;

          if (typeof searchService.search === 'function') {
            result = await searchService.search(resolvedIndexName, resolvedQuery, searchParams);
          } else {
            const index = searchService.index(resolvedIndexName);
            result = await index.search(resolvedQuery, searchParams);
          }

          return {
            success: true,
            outputs: {
              hits: result.hits || [],
              estimatedTotalHits: result.estimatedTotalHits || result.nbHits || 0,
              processingTimeMs: result.processingTimeMs || 0,
            },
            metadata: {
              indexName: resolvedIndexName,
              operation: config.operation,
              query: resolvedQuery,
              hitCount: result.hits?.length || 0,
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

          if (typeof searchService.addDocuments === 'function') {
            result = await searchService.addDocuments(resolvedIndexName, resolvedDocuments);
          } else {
            const index = searchService.index(resolvedIndexName);
            result = await index.addDocuments(resolvedDocuments);
          }

          return {
            success: true,
            outputs: {
              taskUid: result.taskUid || result.uid || null,
              status: result.status || 'enqueued',
            },
            metadata: {
              indexName: resolvedIndexName,
              operation: config.operation,
              documentCount: resolvedDocuments.length,
            },
          };
        }

        case 'createIndex': {
          if (typeof searchService.createIndex === 'function') {
            result = await searchService.createIndex(resolvedIndexName);
          } else {
            result = { taskUid: null, status: 'created' };
          }

          // Configure index attributes if provided
          const index = typeof searchService.index === 'function'
            ? searchService.index(resolvedIndexName)
            : null;

          if (index) {
            if (config.searchableAttributes) {
              await index.updateSearchableAttributes(config.searchableAttributes);
            }
            if (config.filterableAttributes) {
              await index.updateFilterableAttributes(config.filterableAttributes);
            }
            if (config.sortableAttributes) {
              await index.updateSortableAttributes(config.sortableAttributes);
            }
          }

          return {
            success: true,
            outputs: {
              taskUid: result.taskUid || result.uid || null,
              status: result.status || 'created',
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
          if (typeof searchService.deleteIndex === 'function') {
            result = await searchService.deleteIndex(resolvedIndexName);
          } else {
            const index = searchService.index(resolvedIndexName);
            result = await index.delete();
          }

          return {
            success: true,
            outputs: {
              taskUid: result?.taskUid || result?.uid || null,
              status: result?.status || 'deleted',
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
      context.logger.error(`MeiliSearch operation failed: ${message}`);
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
      if (config.filters && typeof config.filters !== 'string') {
        errors.push('filters must be a string');
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
  private getSearchService(context: StepExecutionContext): Reactory.Service.ISearchService | null {
    try {
      const svc = context.reactoryContext.getService(
        'core.ReactorySearchService@1.0.0',
      ) as any;
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
