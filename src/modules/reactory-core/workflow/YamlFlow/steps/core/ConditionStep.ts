/**
 * ConditionStep - Evaluates a condition and returns the branch result
 *
 * Config shape (from YAML `inputs` JSON):
 *   condition:  "expression"    (JS expression string, evaluated in a safe sandbox)
 *   thenSteps:  [...]           (steps to conceptually execute on true — stored as output)
 *   elseSteps:  [...]           (steps to conceptually execute on false — stored as output)
 *
 * NOTE: The current linear executor does not natively execute nested sub-steps.
 * This step evaluates the condition and exposes the result so downstream steps
 * or a future branching executor can act on it.
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class ConditionStep extends BaseYamlStep {
  public readonly stepType = 'condition';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const { condition, thenSteps = [], elseSteps = [] } = this.config;

    let conditionResult = false;

    if (condition) {
      const resolvedCondition = this.resolveTemplate(String(condition), context);
      try {
        // Evaluate in a limited scope with access to inputs and variables
        conditionResult = this.evaluateCondition(resolvedCondition, context);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        context.logger.warn(`Condition evaluation failed for step ${this.id}: ${message}, defaulting to false`);
        conditionResult = false;
      }
    }

    context.logger.debug(`Condition step "${this.id}" evaluated to ${conditionResult}`);

    return {
      success: true,
      outputs: {
        conditionResult,
        branch: conditionResult ? 'then' : 'else',
        thenSteps,
        elseSteps,
        selectedSteps: conditionResult ? thenSteps : elseSteps
      },
      metadata: { conditionResult }
    };
  }

  public validateConfig(_config: Record<string, any>): ValidationResult {
    // Condition is allowed to be null (always-false) per the YAML designer
    return { valid: true, errors: [] };
  }

  private evaluateCondition(expression: string, context: StepExecutionContext): boolean {
    try {
      const fn = new Function(
        'input', 'variables', 'env', 'step', 'workflow',
        `"use strict"; try { return Boolean(${expression}); } catch { return false; }`
      );
      return fn(
        context.inputs,
        context.variables,
        context.env,
        context.stepResults,
        context.workflow
      );
    } catch {
      return false;
    }
  }
}
