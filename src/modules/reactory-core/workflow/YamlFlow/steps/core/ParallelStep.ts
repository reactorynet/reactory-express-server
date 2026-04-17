/**
 * ParallelStep - Executes branches concurrently
 *
 * Config shape (matches IParallelStepConfig):
 *   maxConcurrency: number   (optional, default unlimited)
 *   failFast:       boolean  (optional, default false — stop on first failure)
 *   branches:       IParallelBranch[]  (named groups of steps)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class ParallelStep extends BaseYamlStep {
  public readonly stepType = 'parallel';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      maxConcurrency,
      failFast = false,
      branches = []
    } = this.config;

    context.logger.info(
      `Parallel step "${this.id}": ${branches.length} branches, ` +
      `maxConcurrency=${maxConcurrency ?? 'unlimited'}, failFast=${failFast}`
    );

    // The executor handles actual parallel dispatch.
    // This step exposes branch metadata for downstream orchestration.
    return {
      success: true,
      outputs: {
        branches,
        branchCount: branches.length,
        maxConcurrency: maxConcurrency ?? branches.length,
        failFast,
      },
      metadata: { branchCount: branches.length }
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (config.branches && !Array.isArray(config.branches)) {
      errors.push('branches must be an array');
    }
    if (config.maxConcurrency != null && (typeof config.maxConcurrency !== 'number' || config.maxConcurrency < 1)) {
      errors.push('maxConcurrency must be a positive number');
    }
    return { valid: errors.length === 0, errors };
  }
}
