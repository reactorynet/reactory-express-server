/**
 * WhileStep - Loop with condition evaluation
 *
 * Config shape (matches IWhileStepConfig):
 *   condition:     string   (JS expression evaluated per iteration)
 *   maxIterations: number   (optional, safety limit — default 1000)
 *   steps:         IYamlWorkflowStep[]  (nested steps per iteration)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class WhileStep extends BaseYamlStep {
  public readonly stepType = 'while';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      condition,
      maxIterations = 1000,
      steps = []
    } = this.config;

    const resolvedCondition = condition ? this.resolveTemplate(String(condition), context) : 'false';

    context.logger.info(
      `While step "${this.id}": condition="${resolvedCondition}", maxIterations=${maxIterations}`
    );

    // The executor handles actual loop dispatch.
    // This step evaluates the condition and exposes metadata.
    let conditionResult = false;
    try {
      conditionResult = this.evaluateCondition(resolvedCondition, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.warn(`While condition evaluation failed: ${message}, defaulting to false`);
    }

    return {
      success: true,
      outputs: {
        conditionResult,
        maxIterations,
        nestedSteps: steps,
      },
      metadata: { conditionResult, maxIterations }
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.condition) {
      errors.push('While step requires a condition expression');
    }
    if (config.maxIterations != null && (typeof config.maxIterations !== 'number' || config.maxIterations < 1)) {
      errors.push('maxIterations must be a positive number');
    }
    return { valid: errors.length === 0, errors };
  }

  private evaluateCondition(expression: string, context: StepExecutionContext): boolean {
    try {
      const fn = new Function(
        'input', 'variables', 'env', 'step', 'workflow',
        `"use strict"; try { return Boolean(${expression}); } catch { return false; }`
      );
      return fn(
        context.workflowInputs,
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
