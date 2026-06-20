/**
 * YamlStepBody — the universal workflow-es StepBody adapter for YAML steps.
 *
 * A single StepBody subclass wraps every YAML step type. The YamlFlowBuilder
 * attaches the step definition at build time via the `.input(...)` setup hook,
 * and at run time this adapter:
 *   1. reads the shared, serializable workflow data (TData) off the engine
 *      instance (context.workflow.data);
 *   2. rebuilds a Reactory context from the carried identity (durable-safe);
 *   3. creates the concrete IYamlStep via the shared registry and executes it
 *      with a YAML IStepExecutionContext built from TData;
 *   4. records outputs back into TData.stepResults / TData.outputs and lets
 *      mutations to TData.variables persist (passed by reference).
 *
 * This reuses every existing IYamlStep implementation unchanged, and preserves
 * the exact data-flow conventions used by the standalone executor (variables +
 * stepResults), so steps behave identically whether run by the engine or not.
 */

import { StepBody, StepExecutionContext, ExecutionResult } from '@reactorynet/workflow-es';
import { InstanceResourceManager } from '@reactory/server-modules/reactory-core/workflow/InstanceResourceManager';
import { getYamlStepRegistry, createWorkflowContext, WorkflowIdentity } from './YamlFlowRuntime';
import { StepCreationParams } from '../types/WorkflowDefinition';

/**
 * The serializable workflow-instance state (TData) for engine-run YAML
 * workflows. Everything here must survive JSON persistence + replay.
 */
export interface YamlWorkflowData {
  /** Workflow inputs provided at start. */
  inputs: Record<string, any>;
  /** Workflow-scoped variables (shared across steps; set_variable and to-do steps persist here). */
  variables: Record<string, any>;
  /** Per-step results keyed by step id: { success, outputs, metadata }. */
  stepResults: Record<string, any>;
  /** Environment snapshot. */
  env: Record<string, any>;
  /** Convenience map of step id → outputs. */
  outputs: Record<string, any>;
  /** Serializable identity used to rebuild a Reactory context at run time. */
  __identity?: WorkflowIdentity;
  /** Workflow metadata surfaced to steps. */
  __workflow?: {
    id: string;
    instanceId: string;
    nameSpace: string;
    name: string;
    version: string;
  };
  /** Accumulated non-fatal errors (continueOnError steps). */
  __errors?: Array<{ stepId: string; message: string }>;
  [key: string]: any;
}

/** Ensure the TData container has all required maps. */
export function ensureYamlWorkflowData(data: any): YamlWorkflowData {
  data.inputs = data.inputs || {};
  data.variables = data.variables || {};
  data.stepResults = data.stepResults || {};
  data.env = data.env || {};
  data.outputs = data.outputs || {};
  return data as YamlWorkflowData;
}

/**
 * Resolve the effective config for a step definition.
 * Mirrors YamlWorkflowExecutor.resolveStepConfig: parse `inputs` (which the YAML
 * designer stores as a JSON string), then merge `config` on top (config wins).
 */
function resolveStepConfig(def: any): Record<string, any> {
  let config: Record<string, any> = {};
  if (def.inputs && typeof def.inputs === 'string') {
    try {
      config = JSON.parse(def.inputs);
    } catch {
      config = {};
    }
  } else if (def.inputs && typeof def.inputs === 'object') {
    config = { ...def.inputs };
  }
  if (def.config && typeof def.config === 'object') {
    config = { ...config, ...def.config };
  }
  return config;
}

/** Lazily-resolved Reactory server logger (cached). */
let serverLogger: any;
let serverLoggerResolved = false;
function getServerLogger(): any {
  if (!serverLoggerResolved) {
    serverLoggerResolved = true;
    try {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const mod = require('@reactory/server-core/logging');
      serverLogger = mod.default || mod;
    } catch {
      serverLogger = null;
    }
  }
  return serverLogger;
}

/**
 * Get (or lazily create + register) the InstanceResourceManager for a workflow
 * instance, so every step's logs are written to that instance's log file
 * (<REACTORY_DATA>/workflows/catalog/<ns>/<name>/<version>/logs/<instanceId>.log).
 * Returns null when no instance id is known or REACTORY_DATA is unavailable
 * (e.g. in tests) — callers fall back to the server logger / console.
 */
function getOrCreateInstanceManager(
  instanceId: string | undefined,
  wf: YamlWorkflowData['__workflow'],
): InstanceResourceManager | null {
  if (!instanceId) return null;
  try {
    const existing = InstanceResourceManager.forInstance(instanceId);
    if (existing) return existing;
    const manager = new InstanceResourceManager(
      wf?.nameSpace || 'reactory',
      wf?.name || 'workflow',
      wf?.version || '1.0.0',
      instanceId,
    );
    InstanceResourceManager.register(instanceId, manager);
    manager.info('Workflow instance started', { instanceId, workflow: wf?.id });
    return manager;
  } catch {
    // REACTORY_DATA/APP_DATA_ROOT not set, or fs error — degrade gracefully.
    return null;
  }
}

/**
 * Build the per-step logger. Routes step logging to the workflow instance's
 * InstanceResourceManager (the workflow's own log output), and mirrors to the
 * Reactory server logger for live operator visibility. Falls back to console
 * when neither is available.
 */
function makeLogger(context: StepExecutionContext, data: YamlWorkflowData) {
  const instanceId = (context as any).workflow?.id || data.__workflow?.instanceId;
  const manager = getOrCreateInstanceManager(instanceId, data.__workflow);
  const server = getServerLogger();

  const emit = (level: 'debug' | 'info' | 'warn' | 'error') => (message: string, ...args: any[]) => {
    const meta =
      args.length === 1 && args[0] && typeof args[0] === 'object'
        ? (args[0] as Record<string, unknown>)
        : args.length > 0
          ? { args }
          : undefined;
    let handled = false;
    if (manager) {
      try {
        manager[level](String(message), meta);
        handled = true;
      } catch {
        /* ignore */
      }
    }
    if (server && typeof server[level] === 'function') {
      try {
        server[level](`[wf:${instanceId || '-'}] ${message}`, meta);
        handled = true;
      } catch {
        /* ignore */
      }
    }
    if (!handled) {
      // eslint-disable-next-line no-console
      (console[level] || console.log)(message, ...args);
    }
  };

  return {
    log: emit('info'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    debug: emit('debug'),
  };
}

/** Race a step execution against a timeout (ms). */
async function withTimeout<T>(p: Promise<T>, ms: number, stepId: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Step "${stepId}" timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * No-op anchor step. workflow-es control-flow combinators (.if/.while/.foreach/
 * .parallel) attach to an existing step, so every (sub)workflow must begin with
 * a real step. The builder uses this as the entry anchor.
 */
export class NoOpStepBody extends StepBody {
  public run(_context: StepExecutionContext): Promise<ExecutionResult> {
    return ExecutionResult.next();
  }
}

/**
 * Flush + close the instance log manager and unregister it. Idempotent: a second
 * call is a no-op (forInstance returns null once unregistered), so it is safe to
 * invoke from both the success and compensation (failure) paths.
 */
async function closeInstanceManager(
  instanceId: string | undefined,
  message: string,
  level: 'info' | 'warn',
): Promise<void> {
  if (!instanceId) return;
  try {
    const manager = InstanceResourceManager.forInstance(instanceId);
    if (manager) {
      try {
        manager[level](message, { instanceId });
      } catch {
        /* ignore log failure */
      }
      await manager.close();
    }
  } catch {
    /* ignore — best-effort cleanup */
  }
}

/**
 * Terminal step appended by the builder to the workflow's top-level sequence
 * (success path). Flushes and closes the instance log manager once the
 * workflow's main flow completes successfully.
 */
export class FinalizeStepBody extends StepBody {
  public async run(context: StepExecutionContext): Promise<ExecutionResult> {
    await closeInstanceManager((context as any).workflow?.id, 'Workflow instance completed', 'info');
    return ExecutionResult.next();
  }
}

/** workflow-es numeric statuses for terminal detection. */
const ENGINE_STATUS_COMPLETE = 2;
const ENGINE_STATUS_TERMINATED = 3;

/**
 * Finalize the instance log manager IFF the engine instance has reached a
 * terminal state (Complete or Terminated). Used by the WorkflowRunner's
 * out-of-graph sweeper so the manager is closed even when a step fails and the
 * workflow terminates (the happy path is closed in-graph by FinalizeStepBody).
 *
 * Returns true when the instance was terminal and finalization was attempted
 * (so the caller can stop watching it), false otherwise.
 */
export async function finalizeInstanceIfTerminal(
  persistence: { getWorkflowInstance?: (id: string) => Promise<any> } | null | undefined,
  instanceId: string,
): Promise<boolean> {
  if (!instanceId || !persistence?.getWorkflowInstance) return false;
  let status: number | undefined;
  try {
    const instance = await persistence.getWorkflowInstance(instanceId);
    status = instance?.status;
  } catch {
    return false; // not persisted yet / transient — keep watching
  }
  if (status === ENGINE_STATUS_COMPLETE || status === ENGINE_STATUS_TERMINATED) {
    const failed = status === ENGINE_STATUS_TERMINATED;
    await closeInstanceManager(
      instanceId,
      failed
        ? 'Workflow instance terminated (failed) — finalizing and closing log'
        : 'Workflow instance finalized',
      failed ? 'warn' : 'info',
    );
    return true;
  }
  return false;
}

/**
 * Universal adapter that executes a single YAML step via the registry.
 * `def` (the IYamlWorkflowStep) and `itemVariable` (for foreach scopes) are
 * injected by the builder through the `.input(...)` setup hook.
 */
export class YamlStepBody extends StepBody {
  /** The YAML step definition, injected at build time. */
  public def: any;
  /** foreach item variable name for the enclosing scope, if any. */
  public itemVariable?: string;
  /** foreach index variable name for the enclosing scope, if any. */
  public indexVariable?: string;

  public async run(context: StepExecutionContext): Promise<ExecutionResult> {
    const data = ensureYamlWorkflowData(context.workflow?.data || {});
    const def = this.def;

    if (!def || !def.type) {
      return ExecutionResult.next();
    }

    // Expose the current foreach element (and index, when known) as variables.
    if (context.item !== undefined && context.item !== null && this.itemVariable) {
      data.variables[this.itemVariable] = context.item;
    }

    const reactoryContext = await createWorkflowContext(data.__identity);
    const registry = getYamlStepRegistry();

    const params: StepCreationParams = {
      id: def.id,
      type: def.type,
      config: resolveStepConfig(def),
      inputs: def.inputs,
    };

    const step = registry.createStep(params);

    const stepCtx: any = {
      inputs: data.inputs,
      // legacy field name still read by BaseYamlStep.resolveTemplate
      workflowInputs: data.inputs,
      variables: data.variables, // by reference → variable mutations persist into TData
      env: data.env,
      stepResults: data.stepResults,
      logger: makeLogger(context, data),
      workflow: data.__workflow || {
        id: '',
        instanceId: context.workflow?.id || '',
        nameSpace: '',
        name: '',
        version: '',
      },
      reactoryContext,
    };

    const timeoutMs = typeof def.timeout === 'number' && def.timeout > 0 ? def.timeout : 0;
    const execution = step.execute(stepCtx);
    const result = timeoutMs > 0 ? await withTimeout(execution, timeoutMs, def.id) : await execution;

    // Record outputs into the (serializable) workflow data.
    data.stepResults[def.id] = {
      success: result.success,
      outputs: result.outputs || {},
      metadata: result.metadata || {},
    };
    data.outputs[def.id] = result.outputs || {};

    if (!result.success) {
      const message = result.error || 'Step execution failed';
      data.__errors = data.__errors || [];
      data.__errors.push({ stepId: def.id, message });

      // continueOnError: record and proceed; otherwise throw so the engine's
      // configured error handling (retry / suspend / terminate / compensate)
      // takes over.
      if (def.continueOnError === true) {
        return ExecutionResult.next();
      }
      throw new Error(`[${def.id}] ${message}`);
    }

    return ExecutionResult.next();
  }
}
