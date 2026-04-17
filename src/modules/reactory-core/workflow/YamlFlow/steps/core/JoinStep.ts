/**
 * JoinStep - Waits for parallel branches to complete
 *
 * Config shape (matches IJoinStepConfig):
 *   timeout?:  number   (ms to wait before timing out)
 *   strategy?: 'all' | 'any' | 'n_of'  (default 'all')
 *   count?:    number   (required when strategy is 'n_of')
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class JoinStep extends BaseYamlStep {
  public readonly stepType = 'join';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      timeout,
      strategy = 'all',
      count,
    } = this.config;

    context.logger.info(
      `Join step "${this.id}": strategy=${strategy}` +
      (count != null ? `, count=${count}` : '') +
      (timeout != null ? `, timeout=${timeout}ms` : '')
    );

    // The executor handles the actual synchronization of parallel branches.
    // This step exposes the join configuration for the orchestrator.
    return {
      success: true,
      outputs: { strategy, timeout, count, joined: true },
      metadata: { strategy }
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const validStrategies = ['all', 'any', 'n_of'];
    if (config.strategy && !validStrategies.includes(config.strategy)) {
      errors.push(`strategy must be one of: ${validStrategies.join(', ')}`);
    }
    if (config.strategy === 'n_of' && (typeof config.count !== 'number' || config.count < 1)) {
      errors.push('count is required and must be a positive number when strategy is n_of');
    }
    return { valid: errors.length === 0, errors };
  }
}
