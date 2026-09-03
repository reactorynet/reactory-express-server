/**
 * UserActivityStep - Pauses workflow for user interaction
 *
 * Config shape (matches IUserActivityStepConfig):
 *   activityType:  'approval' | 'input' | 'review' | 'acknowledgement'
 *   assignee?:     string   (user id or expression)
 *   timeout?:      number   (ms before auto-timeout)
 *   formSchemaId?: string   (Reactory form schema to present)
 *   message?:      string   (message to display to the user)
 *   fqn?:          string   (fully qualified component name to render for this activity)
 *   props?:        Record<string, any>   (static props passed to the component)
 *   propsMap?:     Record<string, string> (maps workflow data paths to component prop keys)
 *
 * When the executor encounters requiresUserInput: true it MUST suspend the
 * workflow instance and wait for an external resume event before continuing.
 * The resumed payload should carry the user's response under the same step id.
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class UserActivityStep extends BaseYamlStep {
  public readonly stepType = 'user_activity';

  /**
   * Builds the resolved component props by merging static `props` with values
   * sourced via `propsMap`.
   *
   * Each entry in `propsMap` is `{ propKey: "context.path" }` where the path
   * uses dot-notation relative to a flat source object:
   *
   *   { input, variables, steps, env }
   *
   * When `context.utils.lodash` is available (i.e. a full Reactory server
   * context is present) `lodash.get` is used — this preserves the original
   * value type (numbers, booleans, objects, arrays).  In bare test/CLI
   * environments the method falls back to wrapping the path in `${}` and
   * running it through `resolveTemplate`, which always returns a string.
   */
  private resolveComponentProps(
    staticProps: Record<string, any>,
    propsMap: Record<string, string>,
    context: StepExecutionContext,
  ): Record<string, any> {
    const resolved: Record<string, any> = { ...staticProps };

    const lodash = context.reactoryContext?.utils?.lodash
      ?? (context as Record<string, any>).utils?.lodash;
    const sourceData = {
      input: (context as any).workflowInputs ?? (context as any).inputs ?? {},
      inputs: (context as any).workflowInputs ?? (context as any).inputs ?? {},
      variables: context.variables,
      steps: context.stepResults,
      env: context.env,
    };

    for (const [propKey, contextPath] of Object.entries(propsMap)) {
      if (lodash) {
        const value = lodash.get(sourceData, contextPath);
        if (value !== undefined) {
          resolved[propKey] = value;
        }
      } else {
        // Fallback: string-only resolution via template engine
        const tpl = `\${${contextPath}}`;
        const value = this.resolveTemplate(tpl, context);
        if (value !== tpl) {
          resolved[propKey] = value;
        }
      }
    }

    return resolved;
  }

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      activityType = 'input',
      assignee,
      timeout,
      formSchemaId,
      message,
      fqn,
      props = {},
      propsMap = {},
    } = this.config;

    const resolvedMessage = message ? this.resolveTemplate(String(message), context) : undefined;
    const resolvedAssignee = assignee ? this.resolveTemplate(String(assignee), context) : undefined;
    const resolvedFormSchemaId = formSchemaId ? this.resolveTemplate(String(formSchemaId), context) : undefined;
    const resolvedFqn = fqn ? this.resolveTemplate(String(fqn), context) : undefined;

    const componentProps = resolvedFqn
      ? this.resolveComponentProps(props as Record<string, unknown>, propsMap as Record<string, string>, context)
      : undefined;

    context.logger.info(
      `UserActivity step "${this.id}": type=${activityType}` +
      (resolvedAssignee ? `, assignee=${resolvedAssignee}` : '') +
      (resolvedFqn ? `, component=${resolvedFqn}` : '') +
      (timeout ? `, timeout=${timeout}ms` : '')
    );

    // Auto-create/upsert Task in MongoDB if Reactory Context is available
    if (context.reactoryContext) {
      try {
        const TaskModel = (await import('../../../models/Task')).default;
        const targetUserId = resolvedAssignee || context.reactoryContext.user?._id;
        const workflowId = (context as any).workflowId
          || (context as any).workflowDefinitionId
          || (context.workflow ? `${context.workflow.nameSpace}.${context.workflow.name}@${context.workflow.version}` : undefined);

        if (targetUserId) {
          const task = new TaskModel({
            title: resolvedMessage || `Workflow Task: ${this.id}`,
            description: `Activity "${activityType}" waiting for user action in step "${this.id}"`,
            category: 'workflow',
            workflowStatus: 'awaiting_input',
            status: 'pending',
            workflowId,
            instanceId: context.executionId,
            stepId: this.id,
            componentFqn: resolvedFqn,
            componentProps,
            formSchemaId: resolvedFormSchemaId,
            user: targetUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await task.save();

          if (context.reactoryContext.hasFeature && context.reactoryContext.hasFeature('core.ReactoryAMQService')) {
            const amq = context.reactoryContext.getService('core.ReactoryAMQService@1.0.0') as any;
            if (amq && amq.publish) {
              amq.publish('workflow', 'workflow.task.created', {
                taskId: task._id.toString(),
                workflowId,
                instanceId: context.executionId,
                stepId: this.id,
                userId: targetUserId.toString(),
              });
            }
          }
        }
      } catch (err: any) {
        context.logger.warn(`Could not persist Task document for user_activity step: ${err.message}`);
      }
    }

    // Returning requiresUserInput: true signals the executor to SUSPEND the
    // workflow instance at this step. Execution resumes only when an external
    // event delivers the user's response (e.g. via completeWorkflowTask or signalWorkflowInstance).
    return {
      success: true,
      outputs: {
        activityType,
        assignee: resolvedAssignee,
        formSchemaId: resolvedFormSchemaId,
        message: resolvedMessage,
        fqn: resolvedFqn,
        componentProps,
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
    if (config.propsMap !== undefined && typeof config.propsMap !== 'object') {
      errors.push('propsMap must be a plain object mapping prop keys to context paths');
    }
    if (config.props !== undefined && typeof config.props !== 'object') {
      errors.push('props must be a plain object');
    }
    return { valid: errors.length === 0, errors };
  }
}
