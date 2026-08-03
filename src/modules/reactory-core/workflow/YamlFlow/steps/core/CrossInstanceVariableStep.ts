/**
 * CrossInstanceVariableStep - Set, get, or delete persistent global or workflow-scoped variables
 *
 * Config shape (from YAML `inputs` JSON):
 *   action:      "set"          (required — one of set, get, delete)
 *   scope:       "workflow"     (required — one of global, workflow)
 *   key:         "watermark"    (required — variable name)
 *   value:       "2026-07-28"   (for set — literal value or resolved template)
 *   source:      "literal"      (optional — where to read the value: literal, step_output, input, env)
 *   sourcePath:  "steps.x.data" (optional — dot-path used with step_output / input / env sources)
 *
 * Output: { key, value, scope, action }
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '../interfaces/IYamlStep';

/** Valid actions */
type VariableAction = 'set' | 'get' | 'delete';

/** Valid scopes */
type VariableScope = 'global' | 'workflow';

/** Valid value sources */
type VariableSource = 'literal' | 'step_output' | 'input' | 'env';

/**
 * Configuration interface for CrossInstanceVariableStep
 */
export interface CrossInstanceVariableStepConfig {
  /** The action to perform */
  action: VariableAction;

  /** Scope of the persistent variable */
  scope: VariableScope;

  /** Variable key / name */
  key: string;

  /** Literal value to set (when source = 'literal' or omitted) */
  value?: any;

  /** Where to read the value from */
  source?: VariableSource;

  /** Dot-path for reading the value from step_output, input, or env */
  sourcePath?: string;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for managing persistent cross-instance variables in MongoDB
 */
export class CrossInstanceVariableStep extends BaseYamlStep {
  public readonly stepType = 'cross_instance_variable';

  /**
   * Execute the cross-instance variable step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as CrossInstanceVariableStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot execute persistent variable operations',
        outputs: {},
        metadata: {},
      };
    }

    const resolvedKey = this.resolveTemplate(config.key, context);
    const action = config.action;
    const scope = config.scope;
    const source: VariableSource = config.source || 'literal';

    try {
      const db = context.reactoryContext.mongoose?.connection?.db;
      if (!db) {
        return {
          success: false,
          error: 'MongoDB database connection not available on Reactory context',
          outputs: {},
          metadata: {},
        };
      }

      // Store in a dedicated collection for cross-instance variables
      const collection = db.collection('reactory_cross_instance_variables');

      // Determine the scope identifier
      const workflowIdentifier = scope === 'workflow'
        ? `${context.workflow.nameSpace}.${context.workflow.name}`
        : null;

      // Build search query
      const query: Record<string, any> = {
        key: resolvedKey,
        scope,
      };

      if (scope === 'workflow') {
        query.workflowIdentifier = workflowIdentifier;
      }

      context.logger.info(`Cross-instance variable [${scope}] ${action}: "${resolvedKey}"`);

      switch (action) {
        case 'set': {
          const resolvedValue = this.resolveValue(config, source, context);

          await collection.updateOne(
            query,
            {
              $set: {
                value: resolvedValue,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                key: resolvedKey,
                scope,
                workflowIdentifier,
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );

          context.logger.debug(
            `Cross-instance variable "${resolvedKey}" [${scope}] set to ${JSON.stringify(resolvedValue)}`,
          );

          return {
            success: true,
            outputs: { key: resolvedKey, value: resolvedValue, scope, action: 'set' },
            metadata: { key: resolvedKey, scope, source },
          };
        }

        case 'get': {
          const record = await collection.findOne(query);
          const exists = !!record;
          const value = exists ? record.value : undefined;

          context.logger.debug(
            `Cross-instance variable "${resolvedKey}" [${scope}] ${exists ? `= ${JSON.stringify(value)}` : 'does not exist'}`,
          );

          // Automatically inject into local variables to make downstream template interpolation seamless!
          if (exists) {
            context.variables[resolvedKey] = value;
          }

          return {
            success: true,
            outputs: { key: resolvedKey, value, scope, action: 'get', exists },
            metadata: { key: resolvedKey, scope, exists },
          };
        }

        case 'delete': {
          const deleteResult = await collection.deleteOne(query);
          const existed = deleteResult.deletedCount > 0;

          context.logger.debug(
            `Cross-instance variable "${resolvedKey}" [${scope}] ${existed ? 'deleted' : 'did not exist'}`,
          );

          // Also remove from local variables if present
          if (resolvedKey in context.variables) {
            delete context.variables[resolvedKey];
          }

          return {
            success: true,
            outputs: { key: resolvedKey, scope, action: 'delete', existed },
            metadata: { key: resolvedKey, scope, existed },
          };
        }

        default:
          return {
            success: false,
            error: `Unsupported action: "${action}"`,
            outputs: {},
            metadata: { action, key: resolvedKey },
          };
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`CrossInstanceVariable step failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: { action, key: resolvedKey },
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

    const validActions: VariableAction[] = ['set', 'get', 'delete'];
    if (!config.action || !validActions.includes(config.action)) {
      errors.push(`action is required and must be one of: ${validActions.join(', ')}`);
    }

    const validScopes: VariableScope[] = ['global', 'workflow'];
    if (!config.scope || !validScopes.includes(config.scope)) {
      errors.push(`scope is required and must be one of: ${validScopes.join(', ')}`);
    }

    if (!config.key || typeof config.key !== 'string') {
      errors.push('key is required and must be a string');
    }

    if (config.action === 'set') {
      const source: VariableSource = config.source || 'literal';
      const validSources: VariableSource[] = ['literal', 'step_output', 'input', 'env'];

      if (!validSources.includes(source)) {
        errors.push(`source must be one of: ${validSources.join(', ')}`);
      }

      if (source === 'literal' && config.value === undefined) {
        warnings.push('action is "set" with source "literal" but no value is provided — variable will be set to undefined');
      }

      if ((source === 'step_output' || source === 'input' || source === 'env') && !config.sourcePath) {
        errors.push(`sourcePath is required when source is "${source}"`);
      }

      if (config.sourcePath && typeof config.sourcePath !== 'string') {
        errors.push('sourcePath must be a string');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Resolve the value to set based on the configured source
   * @param config - Step configuration
   * @param source - Value source type
   * @param context - Execution context
   * @returns Resolved value
   */
  private resolveValue(
    config: CrossInstanceVariableStepConfig,
    source: VariableSource,
    context: StepExecutionContext,
  ): any {
    switch (source) {
      case 'literal': {
        return this.resolveParams(config.value, context);
      }

      case 'step_output': {
        if (!config.sourcePath) {
          throw new Error('sourcePath is required when source is "step_output"');
        }
        return this.getNestedValue(context.stepResults, config.sourcePath);
      }

      case 'input': {
        if (!config.sourcePath) {
          throw new Error('sourcePath is required when source is "input"');
        }
        return this.getNestedValue(context.workflowInputs, config.sourcePath);
      }

      case 'env': {
        if (!config.sourcePath) {
          throw new Error('sourcePath is required when source is "env"');
        }
        return this.getNestedValue(context.env, config.sourcePath);
      }

      default:
        throw new Error(`Unknown source type: "${source}"`);
    }
  }

  /**
   * Get a nested value from an object using a dot-separated path
   * @param obj - Root object
   * @param path - Dot-separated path
   * @returns Value at the path or undefined
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
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
