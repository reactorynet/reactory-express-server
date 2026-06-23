/**
 * MongoWriteStep - Executes MongoDB write operations
 *
 * Config shape (from YAML `inputs` JSON):
 *   connectionId:  "default"              (optional — identifies the connection from partner settings)
 *   collection:    "users"                (required — MongoDB collection name)
 *   operation:     "insertOne"            (required — one of insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany)
 *   document:      { ... }               (for insertOne — document to insert)
 *   documents:     [ { ... }, ... ]       (for insertMany — documents to insert)
 *   filter:        { ... }               (for update/delete — query filter)
 *   update:        { $set: { ... } }     (for update ops — update specification)
 *   upsert:        false                 (optional — for updates, whether to create if not found)
 *
 * Output: { result, modifiedCount, insertedId, insertedIds, deletedCount, upsertedId, matchedCount }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/** Valid write operations */
type MongoWriteOperation =
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany';

/**
 * Configuration interface for MongoWriteStep
 */
export interface MongoWriteStepConfig {
  /** Identifies the MongoDB connection from partner settings */
  connectionId?: string;

  /** MongoDB collection name */
  collection: string;

  /** The write operation to perform */
  operation: MongoWriteOperation;

  /** Document to insert (for insertOne) */
  document?: Record<string, any>;

  /** Documents to insert (for insertMany) */
  documents?: Record<string, any>[];

  /** Query filter (for update/delete operations) */
  filter?: Record<string, any>;

  /** Update specification (for updateOne/updateMany) */
  update?: Record<string, any>;

  /** Whether to create the document if it does not exist (for updates) */
  upsert?: boolean;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for executing MongoDB write operations within a YAML workflow
 */
export class MongoWriteStep extends BaseYamlStep {
  public readonly stepType = 'mongo_write';

  /**
   * Execute the MongoDB write step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as MongoWriteStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot execute MongoDB write',
        outputs: {},
        metadata: {},
      };
    }

    const resolvedCollection = this.resolveTemplate(config.collection, context);
    const resolvedConnectionId = config.connectionId
      ? this.resolveTemplate(config.connectionId, context)
      : 'default';
    const resolvedFilter = config.filter ? this.resolveParams(config.filter, context) : {};
    const resolvedUpdate = config.update ? this.resolveParams(config.update, context) : undefined;
    const resolvedDocument = config.document
      ? this.resolveParams(config.document, context)
      : undefined;
    const resolvedDocuments = config.documents
      ? this.resolveParams(config.documents, context)
      : undefined;

    context.logger.info(
      `Executing MongoDB ${config.operation} on collection "${resolvedCollection}" ` +
        `(connection: ${resolvedConnectionId})`,
    );

    try {
      const mongoService = this.getMongoService(context, resolvedConnectionId);

      if (!mongoService) {
        return {
          success: false,
          error: `MongoDB service not available for connection "${resolvedConnectionId}"`,
          outputs: {},
          metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
        };
      }

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

      let writeResult: any;
      const outputs: Record<string, any> = {};

      switch (config.operation) {
        case 'insertOne': {
          if (!resolvedDocument) {
            return {
              success: false,
              error: 'document is required for insertOne operation',
              outputs: {},
              metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
            };
          }
          writeResult = await collection.insertOne(resolvedDocument);
          outputs.result = writeResult;
          outputs.insertedId = writeResult.insertedId;
          break;
        }

        case 'insertMany': {
          if (!resolvedDocuments || !Array.isArray(resolvedDocuments) || resolvedDocuments.length === 0) {
            return {
              success: false,
              error: 'documents is required for insertMany operation and must be a non-empty array',
              outputs: {},
              metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
            };
          }
          writeResult = await collection.insertMany(resolvedDocuments);
          outputs.result = writeResult;
          outputs.insertedIds = writeResult.insertedIds;
          outputs.insertedCount = writeResult.insertedCount;
          break;
        }

        case 'updateOne': {
          if (!resolvedUpdate) {
            return {
              success: false,
              error: 'update is required for updateOne operation',
              outputs: {},
              metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
            };
          }
          writeResult = await collection.updateOne(resolvedFilter, resolvedUpdate, {
            upsert: config.upsert || false,
          });
          outputs.result = writeResult;
          outputs.modifiedCount = writeResult.modifiedCount;
          outputs.matchedCount = writeResult.matchedCount;
          outputs.upsertedId = writeResult.upsertedId || null;
          break;
        }

        case 'updateMany': {
          if (!resolvedUpdate) {
            return {
              success: false,
              error: 'update is required for updateMany operation',
              outputs: {},
              metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
            };
          }
          writeResult = await collection.updateMany(resolvedFilter, resolvedUpdate, {
            upsert: config.upsert || false,
          });
          outputs.result = writeResult;
          outputs.modifiedCount = writeResult.modifiedCount;
          outputs.matchedCount = writeResult.matchedCount;
          outputs.upsertedId = writeResult.upsertedId || null;
          break;
        }

        case 'deleteOne': {
          writeResult = await collection.deleteOne(resolvedFilter);
          outputs.result = writeResult;
          outputs.deletedCount = writeResult.deletedCount;
          break;
        }

        case 'deleteMany': {
          writeResult = await collection.deleteMany(resolvedFilter);
          outputs.result = writeResult;
          outputs.deletedCount = writeResult.deletedCount;
          break;
        }

        default:
          return {
            success: false,
            error: `Unsupported MongoDB write operation: "${config.operation}"`,
            outputs: {},
            metadata: { connectionId: resolvedConnectionId, collection: resolvedCollection },
          };
      }

      context.logger.info(
        `MongoDB ${config.operation} on "${resolvedCollection}" completed successfully`,
      );

      return {
        success: true,
        outputs,
        metadata: {
          connectionId: resolvedConnectionId,
          collection: resolvedCollection,
          operation: config.operation,
          acknowledged: writeResult?.acknowledged ?? true,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`MongoDB write failed: ${message}`);
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

    const validOps: MongoWriteOperation[] = [
      'insertOne',
      'insertMany',
      'updateOne',
      'updateMany',
      'deleteOne',
      'deleteMany',
    ];
    if (!config.operation || !validOps.includes(config.operation)) {
      errors.push(`operation is required and must be one of: ${validOps.join(', ')}`);
    }

    // Operation-specific validation
    if (config.operation === 'insertOne') {
      if (!config.document || typeof config.document !== 'object') {
        errors.push('document is required for insertOne and must be an object');
      }
    }

    if (config.operation === 'insertMany') {
      if (!config.documents || !Array.isArray(config.documents)) {
        errors.push('documents is required for insertMany and must be an array');
      } else if (config.documents.length === 0) {
        warnings.push('documents array is empty — no documents will be inserted');
      }
    }

    if (config.operation === 'updateOne' || config.operation === 'updateMany') {
      if (!config.update || typeof config.update !== 'object') {
        errors.push('update is required for update operations and must be an object');
      }
      if (!config.filter) {
        warnings.push('No filter specified for update operation — this may affect all documents');
      }
    }

    if (config.operation === 'deleteOne' || config.operation === 'deleteMany') {
      if (!config.filter || typeof config.filter !== 'object') {
        warnings.push('No filter specified for delete operation — this may delete all documents');
      }
    }

    if (config.filter && typeof config.filter !== 'object') {
      errors.push('filter must be an object');
    }

    if (config.upsert !== undefined && typeof config.upsert !== 'boolean') {
      errors.push('upsert must be a boolean');
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
