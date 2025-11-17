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
  
  /** Configuration for this step */
  public readonly config: Record<string, any>;
  
  /** Whether this step is enabled */
  public readonly enabled: boolean;
  
  /**
   * Constructor for base step
   * @param id - Unique identifier for this step instance
   * @param config - Configuration object for the step
   */
  constructor(id: string, config: Record<string, any>) {
    this.id = id;
    this.config = config;
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
      
      context.logger.debug(`Step ${this.id} completed successfully in ${Date.now() - startTime}ms`);
      
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
  public getStepInfo(): { id: string; type: string; enabled: boolean; config: Record<string, any> } {
    return {
      id: this.id,
      type: this.stepType,
      enabled: this.enabled,
      config: this.config
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
   * Helper method to resolve variable substitutions in strings
   * @param template - String template with ${variable} syntax
   * @param context - Execution context containing variables
   * @returns Resolved string
   */
  protected resolveTemplate(template: string, context: StepExecutionContext): string {
    if (typeof template !== 'string') {
      return template;
    }
    
    return template.replace(/\$\{([^}]+)\}/g, (match, variablePath) => {
      // Try to resolve from variables first
      if (variablePath in context.variables) {
        return String(context.variables[variablePath]);
      }
      
      // Try to resolve from environment
      if (variablePath in context.env) {
        return String(context.env[variablePath]);
      }
      
      // Try to resolve from previous step results
      const stepResultMatch = variablePath.match(/^steps\.([^.]+)\.(.+)$/);
      if (stepResultMatch) {
        const [, stepId, outputPath] = stepResultMatch;
        const stepResult = context.stepResults[stepId];
        if (stepResult && stepResult.outputs) {
          const keys = outputPath.split('.');
          let current: any = stepResult.outputs;
          for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
              current = current[key];
            } else {
              return match; // Return original if not found
            }
          }
          return String(current);
        }
      }
      
      // Return original if no resolution found
      return match;
    });
  }
}
