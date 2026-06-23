/**
 * MongoQueryStep - Executes MongoDB read operations
 *
 * Config shape (from YAML `inputs` JSON):
 *   connectionId:  "default"                 (optional — identifies the connection from partner settings)
 *   collection:    "users"                   (required — MongoDB collection name)
 *   operation:     "find"                    (required — one of find, findOne, aggregate, count)
 *   filter:        { status: "active" }      (optional — MongoDB query filter)
 *   projection:    { name: 1, email: 1 }     (optional — fields to include/exclude)
 *   sort:          { createdAt: -1 }          (optional — sort specification)
 *   limit:         100                        (optional — max documents to return)
 *   skip:          0                          (optional — documents to skip)
 *   pipeline:      [ ... ]                    (optional — aggregation pipeline, for operation = aggregate)
 *
 * Output: { result, count }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/** Valid query operations */
type MongoQueryOperation = 'find' | 'findOne' | 'aggregate' | 'count';

/**
 * Configuration interface for MongoQueryStep
 */
export interface MongoQueryStepConfig {
  /** Identifies the MongoDB connection from partner settings */
  connectionId?: string;

  /** MongoDB collection name */
  collection: string;

  /** The read operation to perform */
  operation: MongoQueryOperation;

  /** MongoDB query filter (for find / findOne / count) */
  filter?: Record<string, any>;

  /** Field projection */
  projection?: Record<string, any>;

  /** Sort specification */
  sort?: Record<string, any>;

  /** Maximum number of documents to return */
  limit?: number;

  /** Number of documents to skip */
  skip?: number;

  /** Aggregation pipeline (for operation = aggregate) */
  pipeline?: Record<string, any>[];

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for executing MongoDB read operations within a YAML workflow
 */
export class MongoQueryStep extends BaseYamlStep {
  public readonly stepType = 'mongo_query';

  /**
   * Execute the MongoDB query step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as MongoQueryStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot execute MongoDB query',
        outputs: {},
        metadata: {},
      };
    }

    const resolvedCollection = this.resolveTemplate(config.collection, context);
    const resolvedConnectionId = config.connectionId
      ? this.resolveTemplate(config.connectionId, context)
      : 'default';
    const resolvedFilter = config.filter ? this.resolveParams(config.filter, context) : {};
    const resolvedProjection = config.projection
      ? this.resolveParams(config.projection, context)
      : undefined;
    const resolvedSort = config.sort ? this.resolveParams(config.sort, context) : undefined;
    const resolvedPipeline = config.pipeline
      ? this.resolveParams(config.pipeline, context)
      : undefined;

    context.logger.info(
      `Executing MongoDB ${config.operation} on collection "${resolvedCollection}" ` +
        `(connection: ${resolvedConnectionId})`,
    );

    try {
      // Obtain the MongoDB-capable service from the Reactory context
      const mongoService = this.getMongoService(context, resolvedConnectionId);

      if (!mongoService) {
        return {
          success: false,
          error: `MongoDB service not available for connection "${resolvedConnectionId}"`,
          outputs: {},
          metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
        };
      }

      let result: any;
      let count: number | undefined;

      const collection = mongoService.db
        ? mongoService.db.collection(resolvedCollection)
        : mongoService.collection
          ? mongoService.collection(resolvedCollection)
          : null;

      if (!collection) {
        return {
          success: false,
          error: 'Unable to access MongoDB collection — service does not expose db or collection method',
          outputs: {},
          metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
        };
      }

      switch (config.operation) {
        case 'find': {
          let cursor = collection.find(resolvedFilter);
          if (resolvedProjection) cursor = cursor.project(resolvedProjection);
          if (resolvedSort) cursor = cursor.sort(resolvedSort);
          if (config.skip) cursor = cursor.skip(config.skip);
          if (config.limit) cursor = cursor.limit(config.limit);
          result = await cursor.toArray();
          count = result.length;
          break;
        }

        case 'findOne': {
          result = await collection.findOne(resolvedFilter, {
            projection: resolvedProjection,
          });
          count = result ? 1 : 0;
          break;
        }

        case 'aggregate': {
          if (!resolvedPipeline || !Array.isArray(resolvedPipeline)) {
            return {
              success: false,
              error: 'pipeline is required for aggregate operations and must be an array',
              outputs: {},
              metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
            };
          }
          result = await collection.aggregate(resolvedPipeline).toArray();
          count = result.length;
          break;
        }

        case 'count': {
          count = await collection.countDocuments(resolvedFilter);
          result = count;
          break;
        }

        default:
          return {
            success: false,
            error: `Unsupported MongoDB query operation: "${config.operation}"`,
            outputs: {},
            metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
          };
      }

      context.logger.info(
        `MongoDB ${config.operation} on "${resolvedCollection}" returned ${count} result(s)`,
      );

      return {
        success: true,
        outputs: { result, count },
        metadata: {
          connectionId: resolvedConnectionId,
          collection: resolvedCollection,
          operation: config.operation,
          resultCount: count,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`MongoDB query failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: {
          connectionId: resolvedConnectionId,
          collection: resolvedCollection,
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

    if (!config.collection || typeof config.collection !== 'string') {
      errors.push('collection is required and must be a string');
    }

    const validOps: MongoQueryOperation[] = ['find', 'findOne', 'aggregate', 'count'];
    if (!config.operation || !validOps.includes(config.operation)) {
      errors.push(`operation is required and must be one of: ${validOps.join(', ')}`);
    }

    if (config.operation === 'aggregate') {
      if (!config.pipeline || !Array.isArray(config.pipeline)) {
        errors.push('pipeline is required for aggregate operations and must be an array');
      }
    }

    if (config.filter && typeof config.filter !== 'object') {
      errors.push('filter must be an object');
    }

    if (config.projection && typeof config.projection !== 'object') {
      errors.push('projection must be an object');
    }

    if (config.sort && typeof config.sort !== 'object') {
      errors.push('sort must be an object');
    }

    if (config.limit !== undefined && (typeof config.limit !== 'number' || config.limit < 0)) {
      errors.push('limit must be a non-negative number');
    }

    if (config.skip !== undefined && (typeof config.skip !== 'number' || config.skip < 0)) {
      errors.push('skip must be a non-negative number');
    }

    if (config.limit && config.limit > 10000) {
      warnings.push('limit is very high (>10000), this may cause performance issues');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Resolve the MongoDB service from the Reactory context
   * @param context - Execution context
   * @param connectionId - Connection identifier
   * @returns MongoDB service or null
   */
  private getMongoService(context: StepExecutionContext, connectionId: string): any {
    try {
      // Try a known Reactory MongoDB service first
      const svc = context.reactoryContext.getService(
        'core.ReactoryMongoService@1.0.0',
      ) as any;
      if (svc) {
        if (typeof svc.getConnection === 'function') {
          return svc.getConnection(connectionId);
        }
        return svc;
      }
    } catch {
      // Service not available
    }

    try {
      // Alternative: try partner's mongo service
      const svc = context.reactoryContext.getService(
        'core.MongoService@1.0.0',
      ) as any;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    // Final attempt: check if mongoose is exposed on the context
    if (context.reactoryContext.mongoose) {
      return { db: context.reactoryContext.mongoose.connection.db };
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
