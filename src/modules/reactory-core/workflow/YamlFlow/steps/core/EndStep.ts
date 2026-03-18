/**
 * EndStep - Exit point marker for YAML workflows
 * Acts as a no-op that signals workflow completion
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class EndStep extends BaseYamlStep {
  public readonly stepType = 'end';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const returnValue = this.config.returnValue ?? 'success';
    context.logger.debug(`Workflow ended: ${context.workflow.name} (return: ${returnValue})`);
    return {
      success: true,
      outputs: { returnValue },
      metadata: {}
    };
  }

  public validateConfig(_config: Record<string, any>): ValidationResult {
    return { valid: true, errors: [] };
  }
}
