/**
 * InvokeWorkflowStep — start (and optionally await) another workflow.
 *
 * Enables workflow composition: a parent workflow can invoke a child workflow,
 * pass it an input payload, and either fire-and-forget or block until the child
 * reaches a terminal state and then surface the child's result data.
 *
 * Config shape (YAML `config`):
 *   workflowId:        "nameSpace.Name@version"   (or provide the split fields below)
 *   workflowNameSpace: "reactory-examples"        (used when workflowId is omitted)
 *   workflowName:      "WaitEvent"
 *   workflowVersion:   "1.0.0"                    (optional, defaults to 1.0.0)
 *   input:             { ... }                    (payload; values support ${...} templates)
 *   waitForCompletion: false                      (when true, block until the child ends)
 *   timeout:           300000                     (ms; max wait when waitForCompletion)
 *   pollInterval:      1000                       (ms; poll cadence when waiting)
 *
 * Outputs:
 *   instanceId  — the child workflow instance id
 *   status      — the child's status label (RUNNING when not awaited)
 *   data        — the child's workflow data (only when waitForCompletion completes)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

const WORKFLOW_SERVICE_ID = 'core.ReactoryWorkflowService@1.0.0';

/** Status labels that indicate the child workflow has reached a terminal state. */
const TERMINAL_STATUSES = new Set(['complete', 'completed', 'terminated', 'failed', 'cancelled']);

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const DEFAULT_POLL_INTERVAL_MS = 1000;

export class InvokeWorkflowStep extends BaseYamlStep {
  public readonly stepType = 'invoke_workflow';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    if (!context.reactoryContext) {
      return { success: false, error: 'No Reactory context available — cannot invoke workflow', outputs: {}, metadata: {} };
    }

    const workflowId = this.resolveWorkflowId(context);
    if (!workflowId) {
      return {
        success: false,
        error: 'invoke_workflow requires a workflowId (or nameSpace + name)',
        outputs: {},
        metadata: {},
      };
    }

    const waitForCompletion = this.config.waitForCompletion === true;
    const timeoutMs = typeof this.config.timeout === 'number' ? this.config.timeout : DEFAULT_TIMEOUT_MS;
    const pollInterval = typeof this.config.pollInterval === 'number' ? this.config.pollInterval : DEFAULT_POLL_INTERVAL_MS;
    const input = this.resolveValue(this.config.input ?? {}, context);

    // Guard against a workflow synchronously invoking itself, which would deadlock.
    const parentId = `${context.workflow?.nameSpace}.${context.workflow?.name}@${context.workflow?.version}`;
    if (waitForCompletion && workflowId === parentId) {
      return {
        success: false,
        error: `invoke_workflow with waitForCompletion cannot invoke its own workflow (${workflowId}) — this would deadlock`,
        outputs: {},
        metadata: { workflowId },
      };
    }

    const workflowService = context.reactoryContext.getService(WORKFLOW_SERVICE_ID) as any;
    if (!workflowService) {
      return { success: false, error: `${WORKFLOW_SERVICE_ID} is not available`, outputs: {}, metadata: {} };
    }

    context.logger.info(`Invoking workflow ${workflowId}${waitForCompletion ? ' (awaiting completion)' : ''}`);

    let childInstanceId: string;
    try {
      const child = await workflowService.startWorkflow(workflowId, { input });
      childInstanceId = child?.id;
      if (!childInstanceId) {
        return { success: false, error: `Failed to start workflow ${workflowId} — no instance id returned`, outputs: {}, metadata: { workflowId } };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`Failed to start workflow ${workflowId}: ${message}`);
      return { success: false, error: message, outputs: {}, metadata: { workflowId } };
    }

    if (!waitForCompletion) {
      return {
        success: true,
        outputs: { instanceId: childInstanceId, status: 'RUNNING' },
        metadata: { workflowId, waited: false },
      };
    }

    // Poll the child's durable history until it reaches a terminal state or we time out.
    const deadline = Date.now() + timeoutMs;
    let lastStatus = 'RUNNING';
    let lastData: any = undefined;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      let instance: any;
      try {
        instance = await workflowService.getWorkflowHistoryById(childInstanceId);
      } catch (err) {
        context.logger.warn(`invoke_workflow poll failed: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      if (!instance) continue;

      lastStatus = instance.statusLabel || String(instance.status);
      lastData = instance.data;

      if (TERMINAL_STATUSES.has(String(lastStatus).toLowerCase())) {
        const failed = ['failed', 'terminated', 'cancelled'].includes(String(lastStatus).toLowerCase());
        return {
          success: !failed,
          error: failed ? `Child workflow ${childInstanceId} ended with status ${lastStatus}` : undefined,
          outputs: { instanceId: childInstanceId, status: lastStatus, data: lastData },
          metadata: { workflowId, waited: true },
        };
      }
    }

    return {
      success: false,
      error: `Timed out after ${timeoutMs}ms waiting for workflow ${workflowId} (${childInstanceId}); last status: ${lastStatus}`,
      outputs: { instanceId: childInstanceId, status: lastStatus, data: lastData },
      metadata: { workflowId, waited: true, timedOut: true },
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const hasWorkflowId = typeof config.workflowId === 'string' && config.workflowId.length > 0;
    const hasParts = typeof config.workflowNameSpace === 'string' && typeof config.workflowName === 'string';
    if (!hasWorkflowId && !hasParts) {
      errors.push('invoke_workflow requires "workflowId" (e.g. "ns.Name@1.0.0") or both "workflowNameSpace" and "workflowName"');
    }
    if (config.timeout !== undefined && typeof config.timeout !== 'number') {
      errors.push('timeout must be a number (milliseconds)');
    }
    return { valid: errors.length === 0, errors };
  }

  /** Resolve the target workflow id from workflowId or nameSpace/name/version. */
  private resolveWorkflowId(context: StepExecutionContext): string | null {
    if (this.config.workflowId) {
      return this.resolveTemplate(String(this.config.workflowId), context);
    }
    if (this.config.workflowNameSpace && this.config.workflowName) {
      const nameSpace = this.resolveTemplate(String(this.config.workflowNameSpace), context);
      const name = this.resolveTemplate(String(this.config.workflowName), context);
      const version = this.config.workflowVersion ? this.resolveTemplate(String(this.config.workflowVersion), context) : '1.0.0';
      return `${nameSpace}.${name}@${version}`;
    }
    return null;
  }

  /** Deep-resolve ${...} templates inside strings/objects/arrays. */
  private resolveValue(value: any, context: StepExecutionContext): any {
    if (typeof value === 'string') return this.resolveTemplate(value, context);
    if (Array.isArray(value)) return value.map((v) => this.resolveValue(v, context));
    if (value && typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.resolveValue(v, context);
      return out;
    }
    return value;
  }
}
