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
 *      mutations to TData.variables persist (passed by reference);
 *   5. honours an optional durable control directive on the result — a step may ask
 *      to suspend until an external event (`control.waitForEvent`) or to sleep and
 *      re-run (`control.sleep`), which is how module-contributed leaf steps get
 *      first-class suspend/resume without being hardcoded into the builder's
 *      STRUCTURAL_TYPES.
 *
 * This reuses every existing IYamlStep implementation unchanged, and preserves
 * the exact data-flow conventions used by the standalone executor (variables +
 * stepResults), so steps behave identically whether run by the engine or not.
 */

import { StepBody, StepExecutionContext, ExecutionResult } from '@reactorynet/workflow-es';
import { InstanceResourceManager } from '@reactory/server-modules/reactory-core/workflow/InstanceResourceManager';
import { getYamlStepRegistry, createWorkflowContext, WorkflowIdentity } from './YamlFlowRuntime';
import { StepCreationParams } from '../types/WorkflowDefinition';
import { StepControlDirective, StepExecutionResult } from '../steps/interfaces/IYamlStep';

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

/**
 * Coerce a step output into JSON-serializable, durable-safe data. Step outputs
 * are persisted into the workflow instance; a non-BSON-serializable value (a
 * mongoose document, a circular structure, functions, etc.) breaks persistence,
 * which silently discards the step advance and causes the engine to re-run the
 * step forever. Round-tripping through JSON drops the unsafe parts; on failure
 * (circular refs) we fall back to a stringified form.
 */
function toSerializable(value: any): any {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    try {
      return { value: String(value) };
    } catch {
      return {};
    }
  }
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
 * Resolve a `sleep` directive to an absolute instant. `until` (ISO-8601) wins over
 * `durationMs`; an unparseable or past value collapses to "as soon as possible"
 * (now), which re-queues the instance on the next poll rather than sleeping forever.
 */
function resolveSleepUntil(sleep: NonNullable<StepControlDirective['sleep']>): Date {
  if (sleep.until) {
    const parsed = new Date(sleep.until);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const durationMs = typeof sleep.durationMs === 'number' && sleep.durationMs > 0 ? sleep.durationMs : 0;
  return new Date(Date.now() + durationMs);
}

/**
 * No-op anchor step. workflow-es control-flow combinators (.if/.while/.foreach/
 * .parallel) attach to an existing step, so every (sub)workflow must begin with
 * a real step. The builder uses this as the entry anchor.
 */
export class NoOpStepBody extends StepBody {
  public run(context: StepExecutionContext): Promise<ExecutionResult> {
    if ((context as any).pointer) (context as any).pointer.stepName = '(start)';
    return ExecutionResult.next();
  }
}

/**
 * Lightweight named marker step.
 *
 * The structural combinators (condition/for_each/while/parallel/saga/join) are
 * built with native workflow-es primitives whose bodies never set
 * `pointer.stepName`. Prepending this marker before such a combinator stamps a
 * mapped, human-readable name onto the container step's entry pointer, so the
 * inspectors and visual designer can identify it (leaf steps get their name via
 * YamlStepBody). It completes immediately and continues to the combinator.
 */
export class NamedMarkerStepBody extends StepBody {
  /** The YAML step id, stamped onto the pointer for identification. */
  public stepName: string;

  public run(context: StepExecutionContext): Promise<ExecutionResult> {
    const pointer: any = (context as any).pointer;
    if (pointer && this.stepName) pointer.stepName = this.stepName;
    return ExecutionResult.next();
  }
}

/**
 * Durable "wait for event" step body.
 *
 * workflow-es ships a native `WaitFor` primitive, but its body never sets
 * `pointer.stepName`, so a suspended wait_event pointer carries no step name and
 * cannot be mapped back to its YAML step id by the inspectors / visual designer.
 * This body replicates the native suspend/resume semantics exactly, and
 * additionally stamps the pointer with the YAML step id so the waiting step is
 * identifiable everywhere (CLI, inspector, visual inspector, event signalling).
 */
export class WaitForEventStepBody extends StepBody {
  /** Event name to subscribe to (set via an input expression). */
  public eventName: string;
  /** Resolved correlation key (set via an input expression). */
  public eventKey: string;
  /** Effective-date threshold for matching events (set via an input expression). */
  public effectiveDate: Date;
  /** The YAML step id, stamped onto the pointer for identification. */
  public stepName: string;
  /** Captured event payload, exposed to the step's output expression. */
  public eventData: any;

  public run(context: StepExecutionContext): Promise<ExecutionResult> {
    const pointer: any = (context as any).pointer;
    if (pointer && this.stepName) pointer.stepName = this.stepName;

    if (!pointer?.eventPublished) {
      const eff = this.effectiveDate || new Date(2000, 1, 1);
      return ExecutionResult.waitForEvent(this.eventName, this.eventKey, eff);
    }

    this.eventData = pointer.eventData;
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
    if ((context as any).pointer) (context as any).pointer.stepName = '(finalize)';
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

    // Label the engine execution pointer with the YAML step id so the instance
    // inspector shows meaningful step names instead of "Step <n>".
    if ((context as any).pointer) {
      (context as any).pointer.stepName = def.name || def.id;
    }

    // Expose the current foreach element (and index, when known) as variables.
    if (context.item !== undefined && context.item !== null && this.itemVariable) {
      data.variables[this.itemVariable] = context.item;
    }

    // Build the logger up front so setup failures (config validation, etc.) are
    // also captured in the instance log, not just step-execution failures.
    const logger = makeLogger(context, data);
    const reactoryContext = await createWorkflowContext(data.__identity);
    const registry = getYamlStepRegistry();

    // Marker so the catch-all below doesn't double-log a failure already logged
    // and rethrown by the !result.success branch.
    const thrownPrefix = `[${def.id}] `;

    try {
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
        logger,
        // The ENGINE instance id wins over the one carried in TData: workflow data is
        // built before host.startWorkflow() returns, so __workflow.instanceId is an
        // empty placeholder. Steps that correlate external work back to this instance
        // (a Temporal completion watch, a user task) need the real id, and the engine
        // instance is the only place it exists at run time.
        //
        // tenantId likewise: the engine matches event subscriptions strictly by
        // tenant, so anything that will later publish an event to wake this step must
        // know which tenant the instance actually runs under — not the tenant of
        // whatever context happens to be executing the step.
        workflow: {
          ...(data.__workflow || { id: '', nameSpace: '', name: '', version: '' }),
          instanceId: (context as any).workflow?.id || data.__workflow?.instanceId || '',
          tenantId: (context as any).workflow?.tenantId,
        },
        reactoryContext,
        utils: reactoryContext?.utils,
        // Durable control channel. `eventPublished`/`eventData` are set by the
        // engine when a waitForEvent suspension is satisfied (the SAME step body
        // re-runs); `persistenceData` carries state across a sleep directive.
        control: {
          supportsSuspend: true,
          eventPublished: !!(context as any).pointer?.eventPublished,
          eventData: (context as any).pointer?.eventData,
          persistenceData: (context as any).persistenceData,
        },
      };

      const timeoutMs = typeof def.timeout === 'number' && def.timeout > 0 ? def.timeout : 0;
      const execution = step.execute(stepCtx);
      const result = timeoutMs > 0 ? await withTimeout(execution, timeoutMs, def.id) : await execution;

      // Record outputs into the workflow data — sanitized to JSON-serializable
      // form so a step returning non-serializable data can never break the
      // durable instance persistence (which would loop the step forever).
      const safeOutputs = toSerializable(result.outputs || {});
      data.stepResults[def.id] = {
        success: result.success,
        outputs: safeOutputs,
        metadata: toSerializable(result.metadata || {}),
      };
      data.outputs[def.id] = safeOutputs;

      // Durable control directives — evaluated AFTER outputs are recorded into TData
      // (above), so a step that suspends can read its own outputs back on resume via
      // context.stepResults[<stepId>].outputs. Only honoured on a successful result;
      // failure handling below always wins.
      const control = (result as StepExecutionResult).control;
      if (result.success && control) {
        const alreadyResumed = !!(context as any).pointer?.eventPublished;
        if (control.waitForEvent && !alreadyResumed) {
          const { eventName, eventKey } = control.waitForEvent;
          if (!eventName) {
            throw new Error(`${thrownPrefix}waitForEvent directive requires an eventName`);
          }
          logger.info(
            `Step "${def.id}" (${def.type}) suspending until event "${eventName}" (key: ${eventKey ?? ''})`,
          );
          // effectiveDate is ALWAYS now: the engine matches a subscription only when
          // subscribeAsOf <= event.eventTime, so a future effectiveDate would make
          // the subscription ignore events published before it — delaying eligibility
          // rather than timing the wait out. Timeouts must be delivered as events.
          return ExecutionResult.waitForEvent(eventName, eventKey ?? '', new Date());
        }
        if (control.sleep) {
          const until = resolveSleepUntil(control.sleep);
          logger.debug(
            `Step "${def.id}" (${def.type}) sleeping until ${until.toISOString()}`,
          );
          return ExecutionResult.sleep(until, {
            ...(control.persist || {}),
            __stepId: def.id,
          });
        }
      }

      if (!result.success) {
        const message = result.error || 'Step execution failed';
        data.__errors = data.__errors || [];
        data.__errors.push({ stepId: def.id, message });

        // continueOnError: record + log a warning and proceed; otherwise log the
        // error and throw so the engine's error handling (retry / suspend /
        // terminate / compensate) takes over.
        if (def.continueOnError === true) {
          logger.warn(`Step "${def.id}" (${def.type}) failed (continueOnError): ${message}`);
          return ExecutionResult.next();
        }
        logger.error(`Step "${def.id}" (${def.type}) failed: ${message}`);
        throw new Error(`${thrownPrefix}${message}`);
      }

      return ExecutionResult.next();
    } catch (err) {
      // Catch-all so setup/timeout/unexpected exceptions are logged to the
      // instance log too. Skip the !result.success path (already logged above).
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.startsWith(thrownPrefix)) {
        data.__errors = data.__errors || [];
        data.__errors.push({ stepId: def.id, message: msg });
        logger.error(`Step "${def.id}" (${def.type}) error: ${msg}`);
      }
      throw err;
    }
  }
}
