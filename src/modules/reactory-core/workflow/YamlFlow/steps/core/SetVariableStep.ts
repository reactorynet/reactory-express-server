/**
 * SetVariableStep - Set, get, or delete workflow variables
 *
 * Config shape (from YAML `inputs` JSON):
 *   action:      "set"          (required — one of set, get, delete)
 *   key:         "myVar"        (required — variable name)
 *   value:       "hello"        (for set — the literal value, when source = 'literal' or omitted)
 *   source:      "literal"      (optional — where to read the value: literal, step_output, input, env)
 *   sourcePath:  "steps.x.data" (optional — dot-path used with step_output / input / env sources)
 *
 * Output: { key, value, action }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/** Valid actions for the SetVariableStep */
type VariableAction = 'set' | 'get' | 'delete';

/** Valid value sources */
type VariableSource = 'literal' | 'step_output' | 'input' | 'env';

/**
 * Configuration interface for SetVariableStep
 */
export interface SetVariableStepConfig {
  /** The action to perform */
  action: VariableAction;

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
 * Step for setting, getting, or deleting workflow variables
 */
export class SetVariableStep extends BaseYamlStep {
  public readonly stepType = 'set_variable';

  /**
   * Execute the set-variable step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as SetVariableStepConfig;

    const resolvedKey = this.resolveTemplate(config.key, context);
    const action = config.action;
    const source: VariableSource = config.source || 'literal';

    context.logger.info(`Variable ${action}: "${resolvedKey}" (source: ${source})`);

    try {
      switch (action) {
        case 'set': {
          const resolvedValue = this.resolveValue(config, source, context);
          context.variables[resolvedKey] = resolvedValue;

          context.logger.debug(
            `Variable "${resolvedKey}" set to ${JSON.stringify(resolvedValue)}`,
          );

          return {
            success: true,
            outputs: { key: resolvedKey, value: resolvedValue, action: 'set' },
            metadata: { source, key: resolvedKey },
          };
        }

        case 'get': {
          const currentValue = context.variables[resolvedKey];
          const exists = resolvedKey in context.variables;

          context.logger.debug(
            `Variable "${resolvedKey}" ${exists ? `= ${JSON.stringify(currentValue)}` : 'does not exist'}`,
          );

          return {
            success: true,
            outputs: { key: resolvedKey, value: currentValue, action: 'get', exists },
            metadata: { key: resolvedKey, exists },
          };
        }

        case 'delete': {
          const existed = resolvedKey in context.variables;
          const previousValue = context.variables[resolvedKey];
          delete context.variables[resolvedKey];

          context.logger.debug(
            `Variable "${resolvedKey}" ${existed ? 'deleted' : 'did not exist'}`,
          );

          return {
            success: true,
            outputs: { key: resolvedKey, value: previousValue, action: 'delete', existed },
            metadata: { key: resolvedKey, existed },
          };
        }

        default:
          return {
            success: false,
            error: `Unsupported variable action: "${action}"`,
            outputs: {},
            metadata: { action, key: resolvedKey },
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`SetVariable step failed: ${message}`);
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
    config: SetVariableStepConfig,
    source: VariableSource,
    context: StepExecutionContext,
  ): any {
    switch (source) {
      case 'literal': {
        // Deep-resolve any template strings in the literal value
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
        return this.getNestedValue(context.input, config.sourcePath);
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
