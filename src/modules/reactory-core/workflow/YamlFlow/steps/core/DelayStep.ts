/**
 * DelayStep - Adds delays between workflow steps
 * Useful for rate limiting, testing, or waiting for external systems
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Configuration interface for DelayStep
 */
export interface DelayStepConfig {
  /** Duration to delay in milliseconds */
  duration?: number;
  
  /** Duration in human-readable format (e.g., "5s", "1m", "2h") */
  durationText?: string;
  
  /** Whether step is enabled */
  enabled?: boolean;
  
  /** Optional message to log during delay */
  message?: string;
}

/**
 * Step for adding delays in workflow execution
 */
export class DelayStep extends BaseYamlStep {
  public readonly stepType = 'delay';
  
  /**
   * Execute the delay step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as DelayStepConfig;
    const duration = this.calculateDuration(config);
    const message = config.message ? this.resolveTemplate(config.message, context) : null;
    
    if (message) {
      context.logger.info(`Delaying execution: ${message} (${duration}ms)`);
    } else {
      context.logger.debug(`Delaying execution for ${duration}ms`);
    }
    
    const startTime = Date.now();
    
    // Execute the delay
    await this.delay(duration);
    
    const actualDuration = Date.now() - startTime;
    
    return {
      success: true,
      outputs: {
        delayDuration: duration,
        actualDuration,
        message: message || undefined
      },
      metadata: {
        requestedDelay: duration,
        actualDelay: actualDuration,
        delayAccuracy: Math.abs(actualDuration - duration),
        delayType: config.durationText ? 'text' : 'numeric'
      }
    };
  }
  
  /**
   * Calculate duration from configuration
   * @param config - Step configuration
   * @returns Duration in milliseconds
   */
  private calculateDuration(config: DelayStepConfig): number {
    if (config.duration && typeof config.duration === 'number') {
      return config.duration;
    }
    
    if (config.durationText && typeof config.durationText === 'string') {
      return this.parseDurationText(config.durationText);
    }
    
    // Default to 1 second if no duration specified
    return 1000;
  }
  
  /**
   * Parse human-readable duration text
   * @param durationText - Duration text (e.g., "5s", "1m", "2h")
   * @returns Duration in milliseconds
   */
  private parseDurationText(durationText: string): number {
    const text = durationText.trim().toLowerCase();
    const match = text.match(/^(\d+(?:\.\d+)?)\s*([smhd]?)$/);
    
    if (!match) {
      throw new Error(`Invalid duration format: ${durationText}. Use format like "5s", "1m", "2h", or "3d"`);
    }
    
    const value = parseFloat(match[1]);
    const unit = match[2] || 's'; // Default to seconds
    
    switch (unit) {
      case 's': // seconds
        return value * 1000;
      case 'm': // minutes
        return value * 60 * 1000;
      case 'h': // hours
        return value * 60 * 60 * 1000;
      case 'd': // days
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported duration unit: ${unit}. Use s, m, h, or d`);
    }
  }
  
  /**
   * Execute the actual delay
   * @param duration - Duration in milliseconds
   * @returns Promise that resolves after the delay
   */
  private delay(duration: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Must have either duration or durationText
    if (!config.duration && !config.durationText) {
      errors.push('either duration (number) or durationText (string) is required');
    }
    
    // Validate duration if provided
    if (config.duration !== undefined) {
      if (typeof config.duration !== 'number') {
        errors.push('duration must be a number (milliseconds)');
      } else if (config.duration < 0) {
        errors.push('duration must be non-negative');
      } else if (config.duration > 24 * 60 * 60 * 1000) { // 24 hours
        warnings.push('duration is very long (>24 hours), this may cause workflow timeouts');
      }
    }
    
    // Validate durationText if provided
    if (config.durationText !== undefined) {
      if (typeof config.durationText !== 'string') {
        errors.push('durationText must be a string');
      } else {
        try {
          const parsed = this.parseDurationText(config.durationText);
          if (parsed > 24 * 60 * 60 * 1000) { // 24 hours
            warnings.push('parsed duration is very long (>24 hours), this may cause workflow timeouts');
          }
        } catch (error) {
          errors.push(`invalid durationText format: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }
    }
    
    // Warn if both are provided
    if (config.duration && config.durationText) {
      warnings.push('both duration and durationText provided, duration takes precedence');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
