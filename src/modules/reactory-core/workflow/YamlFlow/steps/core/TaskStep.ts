/**
 * TaskStep - Generic task execution step
 *
 * Config shape:
 *   name:          "Task Name"
 *   taskType:      "custom_script" | "http_request" | "data_transform" | string
 *   configuration: { ... }  (task-specific configuration)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class TaskStep extends BaseYamlStep {
  public readonly stepType = 'task';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const { name = 'Task', taskType = 'custom_script', configuration = {} } = this.config;

    const resolvedName = this.resolveTemplate(String(name), context);

    context.logger.info(`Executing task "${resolvedName}" (type: ${taskType})`);

    // Resolve templates in configuration
    const resolvedConfig: Record<string, any> = {};
    for (const [key, value] of Object.entries(configuration)) {
      if (typeof value === 'string') {
        resolvedConfig[key] = this.resolveTemplate(value, context);
      } else {
        resolvedConfig[key] = value;
      }
    }

    return {
      success: true,
      outputs: { name: resolvedName, taskType, configuration: resolvedConfig },
      metadata: { taskType }
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.name && !config.taskType) {
      errors.push('Task step requires at least a name or taskType');
    }
    return { valid: errors.length === 0, errors };
  }
}
