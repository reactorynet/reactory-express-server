/**
 * Base implementation for all YAML workflow steps
 * Provides common functionality and enforces the IYamlStep contract
 */

import { 
  IYamlStep, 
  StepExecutionContext, 
  StepExecutionResult, 
  ValidationResult 
} from '../interfaces/IYamlStep';

/**
 * Abstract base class for all YAML workflow steps
 * Provides common functionality and error handling
 */
export abstract class BaseYamlStep implements IYamlStep {
  /** Unique identifier for this step instance */
  public readonly id: string;
  
  /** Type of step - must be implemented by subclasses */
  public abstract readonly stepType: string;
  
  /** Static, step-type-specific configuration */
  public readonly config: Record<string, any>;

  /** Dynamic input parameters with variable substitution support */
  public readonly inputs: Record<string, any>;
  
  /** Whether this step is enabled */
  public readonly enabled: boolean;
  
  /**
   * Constructor for base step
   * @param id - Unique identifier for this step instance
   * @param config - Static configuration object for the step
   * @param inputs - Dynamic input parameters (optional)
   */
  constructor(id: string, config: Record<string, any>, inputs?: Record<string, any>) {
    this.id = id;
    this.config = config;
    this.inputs = inputs || {};
    this.enabled = config.enabled !== false; // Default to true unless explicitly false
  }
  
  /**
   * Execute the step with proper error handling and logging
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  public async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Log step execution start
      context.logger.debug(`Executing step: ${this.id} (type: ${this.stepType})`);
      
      // Check if step is enabled
      if (!this.enabled) {
        context.logger.info(`Step ${this.id} is disabled, skipping execution`);
        return {
          success: true,
          skipped: true,
          outputs: {},
          metadata: {
            stepId: this.id,
            stepType: this.stepType,
            executionTime: Date.now() - startTime,
            skipped: true
          }
        };
      }
      
      // Execute the actual step logic
      const result = await this.executeStep(context);
      
      // Add common metadata
      result.metadata = {
        ...result.metadata,
        stepId: this.id,
        stepType: this.stepType,
        executionTime: Date.now() - startTime
      };
      
      if (result.success === false) {
        context.logger.debug(
          `Step ${this.id} returned a failure result in ${Date.now() - startTime}ms` +
          (result.error ? `: ${result.error}` : '')
        );
      } else {
        context.logger.debug(`Step ${this.id} completed successfully in ${Date.now() - startTime}ms`);
      }

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      context.logger.error(`Step ${this.id} failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        stackTrace,
        outputs: {},
        metadata: {
          stepId: this.id,
          stepType: this.stepType,
          executionTime: Date.now() - startTime,
          failed: true
        }
      };
    }
  }
  
  /**
   * Abstract method that must be implemented by subclasses
   * Contains the actual step execution logic
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected abstract executeStep(context: StepExecutionContext): Promise<StepExecutionResult>;
  
  /**
   * Validate the step configuration
   * Default implementation accepts any configuration
   * Override in subclasses for specific validation
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    // Default implementation - no validation
    return {
      valid: true,
      errors: []
    };
  }
  
  /**
   * Get step information for debugging/logging
   * @returns Step information object
   */
  public getStepInfo(): { id: string; type: string; enabled: boolean; config: Record<string, any>; inputs: Record<string, any> } {
    return {
      id: this.id,
      type: this.stepType,
      enabled: this.enabled,
      config: this.config,
      inputs: this.inputs
    };
  }
  
  /**
   * Helper method to safely access nested configuration values
   * @param path - Dot-separated path to the configuration value
   * @param defaultValue - Default value if path not found
   * @returns Configuration value or default
   */
  protected getConfigValue<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let current: any = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue as T;
      }
    }
    
    return current as T;
  }
  
  /**
   * Helper method to safely convert any value to string.
   * If the value is an object or array, it is serialized to a JSON string
   * to prevent "[object Object]" leaking into downstream templates.
   * @param val - Value to stringify
   * @returns String representation of the value
   */
  protected stringifyValue(val: any): string {
    if (val === null || val === undefined) {
      return '';
    }
    if (typeof val === 'object' || Array.isArray(val)) {
      try {
        return JSON.stringify(val);
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  }

  /**
   * Resolve a SINGLE `${...}` expression to its underlying value, preserving type.
   *
   * Supports literals ('x', 42, true, null), `env.X` / `process.env.X`,
   * `input(s).path`, `steps.<id>.<path>`, `variables.path` and bare variable names.
   * Returns undefined when the expression cannot be resolved.
   *
   * Exposed as a method (rather than the closure it used to be) so callers that need
   * the VALUE — an array of workflow arguments, an object payload — can get it
   * without the JSON-string round trip that resolveTemplate necessarily performs.
   * See resolveTemplateValue.
   */
  protected resolveExpression(expr: string, context: StepExecutionContext): any {
    const trimmed = expr.trim();
    if (!trimmed) return undefined;

    // Check if it's a string literal
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      return trimmed.slice(1, -1);
    }

    // Check if it's a boolean or number literal
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);

    // Resolve from environment variables (process.env.VAR or env.VAR)
    const envMatch = trimmed.match(/^(?:process\.)?env\.(.+)$/);
    if (envMatch) {
      const varName = envMatch[1];
      if (context.env && varName in context.env) {
        return context.env[varName];
      }
      if (typeof process !== 'undefined' && process.env && varName in process.env) {
        return process.env[varName];
      }
      return undefined;
      }

      // Resolve from inputs
      const inputMatch = trimmed.match(/^(?:input|inputs)\.(.+)$/);
      if (inputMatch) {
        const inputPath = inputMatch[1];
        const keys = inputPath.split('.');
        let current: any = context.workflowInputs;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return undefined;
          }
        }
        return current;
      }

      // Resolve from steps
      const stepResultMatch = trimmed.match(/^steps\.([^.]+)\.(.+)$/);
      if (stepResultMatch) {
        const [, stepId, outputPath] = stepResultMatch;
        const stepResult = context.stepResults[stepId];
        if (stepResult) {
          const keys = outputPath.split('.');
          const walk = (root: any): any => {
            let current: any = root;
            for (const key of keys) {
              if (current && typeof current === 'object' && key in current) {
                current = current[key];
              } else {
                return undefined;
              }
            }
            return current;
          };
          let value = walk(stepResult);
          if (value === undefined) {
            value = walk(stepResult.outputs);
          }
          return value;
        }
        return undefined;
      }

      // Resolve from variables (explicit variables.VAR or bare VAR)
      if (context.variables && trimmed in context.variables) {
        return context.variables[trimmed];
      }
      const variablesMatch = trimmed.match(/^variables\.(.+)$/);
      if (variablesMatch) {
        const variableSubPath = variablesMatch[1];
        const keys = variableSubPath.split('.');
        let current: any = context.variables;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return undefined;
          }
        }
        return current;
      }

    return undefined;
  }

  /**
   * Resolve an expression list (`a || b || 'default'`) to the first value that
   * resolves to something meaningful, preserving type. Returns undefined when none do.
   */
  protected resolveExpressionList(expression: string, context: StepExecutionContext): any {
    const parts = expression.split('||');
    for (const part of parts) {
      const resolved = this.resolveExpression(part, context);
      if (resolved !== undefined && resolved !== null && resolved !== '') {
        return resolved;
      }
    }
    // Fall back to the first part so an explicit null/empty resolution still wins
    // over "unresolved".
    return this.resolveExpression(parts[0], context);
  }

  /**
   * Helper method to resolve variable substitutions in strings with support for logical OR (||) and literals
   * @param template - String template with ${variable} syntax
   * @param context - Execution context containing variables
   * @returns Resolved string
   */
  protected resolveTemplate(template: string, context: StepExecutionContext): string {
    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const resolved = this.resolveExpressionList(expression, context);
      if (resolved !== undefined) {
        return this.stringifyValue(resolved);
      }
      return match;
    });
  }

  /**
   * Resolve a config value, PRESERVING TYPE when the whole value is a single
   * `${...}` reference.
   *
   * `resolveTemplate` necessarily returns a string — it performs interpolation, so
   * an array or object reference comes back as JSON text. That is wrong for values
   * that are passed onward as data rather than rendered: workflow arguments, request
   * bodies, GraphQL variables. Here:
   *
   *   "${input.rows}"          → the actual array
   *   "batch_${input.id}"      → interpolated string (mixed content)
   *   "${input.missing}"       → the original token, so optional-value handling
   *                              elsewhere can still detect "not supplied"
   *
   * Non-string values are returned unchanged.
   */
  protected resolveTemplateValue(value: any, context: StepExecutionContext): any {
    if (typeof value !== 'string') {
      return value;
    }
    const whole = value.match(/^\s*\$\{([^}]+)\}\s*$/);
    if (whole) {
      const resolved = this.resolveExpressionList(whole[1], context);
      return resolved === undefined ? value : resolved;
    }
    return this.resolveTemplate(value, context);
  }
}
