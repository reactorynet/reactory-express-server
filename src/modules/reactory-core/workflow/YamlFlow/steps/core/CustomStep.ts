/**
 * CustomStep - Catch-all for arbitrary / user-defined step logic
 *
 * Passes through all config and inputs for downstream handling.
 * Modules can register their own step types; this acts as a fallback
 * when a step type isn't matched by any specific implementation.
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class CustomStep extends BaseYamlStep {
  public readonly stepType = 'custom';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    context.logger.info(`Custom step "${this.id}" executing with config keys: ${Object.keys(this.config).join(', ')}`);

    // Resolve template variables in all string config values
    const resolvedConfig: Record<string, any> = {};
    for (const [key, value] of Object.entries(this.config)) {
      if (typeof value === 'string') {
        resolvedConfig[key] = this.resolveTemplate(value, context);
      } else {
        resolvedConfig[key] = value;
      }
    }

    return {
      success: true,
      outputs: { ...resolvedConfig },
      metadata: { configKeys: Object.keys(this.config) }
    };
  }

  public validateConfig(_config: Record<string, any>): ValidationResult {
    return { valid: true, errors: [] };
  }
}
