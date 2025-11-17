/**
 * LogStep - Basic logging step for YAML workflows
 * Outputs messages to the workflow logger
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Configuration interface for LogStep
 */
export interface LogStepConfig {
  /** Message to log */
  message: string;
  
  /** Log level (debug, info, warn, error) */
  level?: 'debug' | 'info' | 'warn' | 'error';
  
  /** Whether step is enabled */
  enabled?: boolean;
  
  /** Additional data to log */
  data?: Record<string, any>;
}

/**
 * Step for logging messages during workflow execution
 */
export class LogStep extends BaseYamlStep {
  public readonly stepType = 'log';
  
  /**
   * Execute the log step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as LogStepConfig;
    const level = config.level || 'info';
    const message = this.resolveTemplate(config.message, context);
    const data = config.data || {};
    
    // Resolve any templates in data
    const resolvedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        resolvedData[key] = this.resolveTemplate(value, context);
      } else {
        resolvedData[key] = value;
      }
    }
    
    // Log the message with appropriate level
    const hasData = Object.keys(resolvedData).length > 0;
    
    switch (level) {
      case 'debug':
        hasData ? context.logger.debug(message, resolvedData) : context.logger.debug(message);
        break;
      case 'info':
        hasData ? context.logger.info(message, resolvedData) : context.logger.info(message);
        break;
      case 'warn':
        hasData ? context.logger.warn(message, resolvedData) : context.logger.warn(message);
        break;
      case 'error':
        hasData ? context.logger.error(message, resolvedData) : context.logger.error(message);
        break;
      default:
        hasData ? context.logger.info(message, resolvedData) : context.logger.info(message);
    }
    
    return {
      success: true,
      outputs: {
        message,
        level,
        data: resolvedData
      },
      metadata: {
        logLevel: level,
        messageLength: message.length,
        hasData: Object.keys(resolvedData).length > 0
      }
    };
  }
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!config.message || typeof config.message !== 'string') {
      errors.push('message is required and must be a string');
    }
    
    // Validate log level if provided
    if (config.level && !['debug', 'info', 'warn', 'error'].includes(config.level)) {
      errors.push('level must be one of: debug, info, warn, error');
    }
    
    // Check message length
    if (config.message && config.message.length > 1000) {
      warnings.push('message is very long (>1000 characters), consider using data field for large content');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
