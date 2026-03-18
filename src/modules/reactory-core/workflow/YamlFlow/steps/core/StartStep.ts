/**
 * StartStep - Entry point marker for YAML workflows
 * Acts as a no-op that signals workflow start
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class StartStep extends BaseYamlStep {
  public readonly stepType = 'start';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    context.logger.debug(`Workflow started: ${context.workflow.name}`);
    return {
      success: true,
      outputs: { started: true },
      metadata: {}
    };
  }

  public validateConfig(_config: Record<string, any>): ValidationResult {
    return { valid: true, errors: [] };
  }
}
