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
 * HOW THE HUMAN GATE ACTUALLY CLOSES
 * ----------------------------------
 * On its first run the step creates (or re-finds) a Task document and then asks the
 * durable engine to SUSPEND on `workflow.task.completed`, correlated by the TASK ID.
 * The UI lists the task (userWorkflowTasks), renders `componentFqn` / `formSchemaId`,
 * and calls the `completeWorkflowTask` mutation, which publishes that event. The same
 * step body then re-runs with the user's `resultData` as its outputs.
 *
 * The task id is the correlation key on purpose. Signalling by step id cannot work:
 * the engine stamps `pointer.stepName` with the step's NAME when it has one, so a
 * named step is unmatchable by its YAML id — and a single instance may hold several
 * user tasks at once. The task id is unambiguous for both.
 *
 * The step is idempotent: an engine retry before the suspension re-finds the pending
 * task for (instanceId, stepId) instead of creating a second one.
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

/**
 * Event published by the completeWorkflowTask mutation, correlated by task id.
 * Shared with the Task resolver so the two halves cannot drift apart.
 */
export const TASK_COMPLETED_EVENT = 'workflow.task.completed';

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

    // ── Resumed: the user completed the task ────────────────────────────────────
    // The payload published by completeWorkflowTask is the user's resultData.
    if (context.control?.eventPublished) {
      const response = context.control.eventData ?? {};
      const priorOutputs = context.stepResults?.[this.id]?.outputs ?? {};
      context.logger.info(
        `UserActivity step "${this.id}" completed by user (task ${priorOutputs.taskId ?? 'unknown'})`,
      );
      return {
        success: true,
        outputs: {
          ...priorOutputs,
          status: 'completed',
          response,
          // Surface the common approval shape directly so YAML can branch on it
          // without knowing the whole payload: ${steps.approve.outputs.approved}
          approved: response?.approved,
          // Identity of the approver, stamped server-side by completeWorkflowTask
          // from the authenticated context — this is the audit trail, so it is never
          // read from the client-submitted payload.
          completedBy: response?.completedBy,
          completedByEmail: response?.completedByEmail,
          completedAt: response?.completedAt,
        },
        metadata: { activityType, taskId: priorOutputs.taskId, resumed: true },
      };
    }

    context.logger.info(
      `UserActivity step "${this.id}": type=${activityType}` +
      (resolvedAssignee ? `, assignee=${resolvedAssignee}` : '') +
      (resolvedFqn ? `, component=${resolvedFqn}` : '') +
      (timeout ? `, timeout=${timeout}ms` : '')
    );

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot create a user task',
        outputs: {},
        metadata: { activityType },
      };
    }

    // ── First run: create (or re-find) the task ─────────────────────────────────
    const instanceId = context.workflow?.instanceId;
    const workflowId = context.workflow
      ? `${context.workflow.nameSpace}.${context.workflow.name}@${context.workflow.version}`
      : undefined;

    let taskId: string;
    let assignedTo: string | undefined;
    try {
      const TaskModel = (await import('../../../../models/Task')).default;
      const targetUserId = await this.resolveAssignee(resolvedAssignee, context);

      if (!targetUserId) {
        return {
          success: false,
          error:
            `user_activity step "${this.id}" could not determine an assignee. Set "assignee" ` +
            '(user id or email), or start the workflow with a user identity.',
          outputs: {},
          metadata: { activityType },
        };
      }
      assignedTo = String(targetUserId);

      // Idempotent: an engine retry before the suspension must not raise a second
      // task for the same gate.
      let task = instanceId
        ? await TaskModel.findOne({ instanceId, stepId: this.id, status: 'pending' }).exec()
        : null;

      if (task) {
        context.logger.debug(`Re-using pending task ${task._id.toString()} for step "${this.id}"`);
      } else {
        task = new TaskModel({
          title: resolvedMessage || `Workflow Task: ${this.id}`,
          description: `Activity "${activityType}" waiting for user action in step "${this.id}"`,
          category: 'workflow',
          workflowStatus: 'awaiting_input',
          status: 'pending',
          workflowId,
          instanceId,
          stepId: this.id,
          componentFqn: resolvedFqn,
          componentProps,
          formSchemaId: resolvedFormSchemaId,
          dueDate: timeout ? new Date(Date.now() + Number(timeout)) : undefined,
          user: targetUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await task.save();
        context.logger.info(
          `Created ${activityType} task ${task._id.toString()} for ${assignedTo} (instance ${instanceId || 'unknown'})`,
        );
      }

      taskId = task._id.toString();

      // NOTE: no notification is published here. `core.ReactoryAMQService@1.0.0` was
      // never registered — the previous publish sat behind a `hasFeature` guard that
      // no context implements, so it silently did nothing. There is also no
      // server→browser transport today, so the task queue polls (see the PWA's
      // useWorkflowTasks). When a real push exists, publish on the server bus in
      // src/amq ($pub.workflow) and bridge it to the client.
    } catch (err: any) {
      // A gate that cannot raise its task must fail: continuing would run the
      // approved path with nobody having approved anything.
      context.logger.error(`Could not create the task for user_activity step: ${err.message}`);
      return {
        success: false,
        error: `Could not create the user task for step "${this.id}": ${err.message}`,
        outputs: {},
        metadata: { activityType },
      };
    }

    const outputs = {
      taskId,
      activityType,
      assignee: assignedTo,
      formSchemaId: resolvedFormSchemaId,
      message: resolvedMessage,
      fqn: resolvedFqn,
      componentProps,
      timeout,
      status: 'pending',
    };

    // ── Suspend until the task is completed ─────────────────────────────────────
    if (context.control?.supportsSuspend !== true) {
      // The standalone executor cannot suspend. The task exists and is actionable,
      // but this run cannot wait for it — say so rather than proceeding as though
      // the gate had been passed.
      context.logger.warn(
        `Step "${this.id}" raised task ${taskId} but this executor cannot suspend — ` +
          'the workflow will continue WITHOUT waiting for the user. Run it on the durable ' +
          'engine for a real approval gate.',
      );
      return { success: true, outputs, metadata: { activityType, taskId, waited: false } };
    }

    return {
      success: true,
      outputs,
      metadata: { activityType, taskId, requiresUserInput: true },
      // Correlated by task id — see the header note on why not by step id.
      control: { waitForEvent: { eventName: TASK_COMPLETED_EVENT, eventKey: taskId } },
    };
  }

  /**
   * Resolve the assignee to a user id.
   *
   * Accepts a user id or an email address; when neither is configured the task falls
   * to the identity the instance carries (the user who started the workflow), which
   * is the sensible default for a self-service gate.
   */
  private async resolveAssignee(
    assignee: string | undefined,
    context: StepExecutionContext,
  ): Promise<string | undefined> {
    if (assignee && !assignee.includes('@')) return assignee;

    if (assignee && assignee.includes('@')) {
      try {
        const UserModel = (await import('../../../../models/User')).default as any;
        const user = await UserModel.findOne({ email: assignee.toLowerCase() }).exec();
        if (user) return String(user._id);
        context.logger.warn(`No user found for assignee "${assignee}" — falling back to the workflow starter`);
      } catch (err: any) {
        context.logger.warn(`Could not look up assignee "${assignee}": ${err.message}`);
      }
    }

    const contextUser = (context.reactoryContext as any)?.user?._id;
    return contextUser ? String(contextUser) : undefined;
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
