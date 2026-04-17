/**
 * UserActivityStep - Pauses workflow for user interaction
 *
 * Config shape (matches IUserActivityStepConfig):
 *   activityType:  'approval' | 'input' | 'review' | 'acknowledgement'
 *   assignee?:     string   (user id or expression)
 *   timeout?:      number   (ms before auto-timeout)
 *   formSchemaId?: string   (Reactory form schema to present)
 *   message?:      string   (message to display to the user)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class UserActivityStep extends BaseYamlStep {
  public readonly stepType = 'user_activity';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      activityType = 'input',
      assignee,
      timeout,
      formSchemaId,
      message,
    } = this.config;

    const resolvedMessage = message ? this.resolveTemplate(String(message), context) : undefined;
    const resolvedAssignee = assignee ? this.resolveTemplate(String(assignee), context) : undefined;
    const resolvedFormSchemaId = formSchemaId ? this.resolveTemplate(String(formSchemaId), context) : undefined;

    context.logger.info(
      `UserActivity step "${this.id}": type=${activityType}` +
      (resolvedAssignee ? `, assignee=${resolvedAssignee}` : '') +
      (timeout ? `, timeout=${timeout}ms` : '')
    );

    // This step creates a pending user activity record.
    // The workflow executor should pause execution until the activity is completed.
    return {
      success: true,
      outputs: {
        activityType,
        assignee: resolvedAssignee,
        formSchemaId: resolvedFormSchemaId,
        message: resolvedMessage,
        timeout,
        status: 'pending',
      },
      metadata: { activityType, requiresUserInput: true }
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const validTypes = ['approval', 'input', 'review', 'acknowledgement'];
    if (config.activityType && !validTypes.includes(config.activityType)) {
      errors.push(`activityType must be one of: ${validTypes.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}
