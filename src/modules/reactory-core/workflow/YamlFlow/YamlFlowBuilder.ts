/**
 * YamlFlowBuilder — translates a declarative YamlWorkflowDefinition into a
 * workflow-es WorkflowBase class so YAML workflows execute through the durable
 * engine (control flow, persistence, replay, scheduling) exactly like code
 * workflows.
 *
 * Each ordinary YAML step becomes a `YamlStepBody` leaf (which delegates to the
 * existing IYamlStep registry). Structural step types are interpreted into the
 * engine's fluent control-flow combinators:
 *
 *   condition   → .if(cond).do(then) [+ .if(!cond).do(else)]
 *   for_each    → .foreach(items).do(body)        (item exposed as a variable)
 *   while       → .while(cond).do(body)
 *   parallel    → .parallel().do(branch)...join()
 *   saga        → .saga(body).compensateWithSequence(compensate)
 *   wait_event  → .waitFor(eventName, eventKey, effectiveDate?)
 *   join        → no-op (parallel already synchronises)
 *
 * Per-step `retryPolicy` maps to `.onError(Retry, interval, maxRetries)` and
 * `timeout` is enforced inside YamlStepBody.
 *
 * Expression scope (conditions, foreach items, event keys) — all evaluated
 * against the workflow data (TData):
 *   input / inputs  → workflow inputs
 *   variables       → workflow variables
 *   env             → environment snapshot
 *   steps           → { <stepId>: <outputs> }
 *   stepResults     → { <stepId>: { success, outputs, metadata } }
 *   workflow        → workflow metadata
 */

import { WorkflowBase, WorkflowBuilder, WorkflowErrorHandling } from '@reactorynet/workflow-es';
import { YamlStepBody, NoOpStepBody, FinalizeStepBody, WaitForEventStepBody, NamedMarkerStepBody, YamlWorkflowData } from './execution/YamlStepBody';

type AnyChain = any;
type AnyStep = any;

interface ScopeOpts {
  itemVariable?: string;
  indexVariable?: string;
}

/** Step types the builder interprets structurally rather than executing as leaves. */
const STRUCTURAL_TYPES = new Set([
  'condition',
  'for_each',
  'while',
  'parallel',
  'join',
  'saga',
  'wait_event',
]);

/** Canonical engine workflow id for a YAML definition. */
export function engineWorkflowId(def: { nameSpace: string; name: string; version: string }): string {
  return `${def.nameSpace}.${def.name}@${def.version}`;
}

/** Engine (numeric) version derived from the semantic version's major component. */
export function engineWorkflowMajorVersion(version: string): number {
  if (!version) return 1;
  const major = parseInt(String(version).split('.')[0], 10);
  return Number.isNaN(major) ? 1 : major;
}

/**
 * Fill in a YAML workflow's declared `inputs.<key>.default` values for any key
 * the caller's start payload didn't supply (or supplied as undefined).
 * Caller-provided values always win. Without this, a workflow started with no
 * (or a partial) input payload never sees the defaults declared in its own
 * `inputs:` schema.
 */
export function applyYamlInputDefaults(
  definitionInputs: Record<string, { default?: any }> | undefined,
  input: any,
): Record<string, any> {
  const provided = input && typeof input === 'object' ? input : {};
  const schema = definitionInputs || {};
  const withDefaults: Record<string, any> = { ...provided };
  for (const [key, param] of Object.entries(schema)) {
    if (withDefaults[key] === undefined && param && param.default !== undefined) {
      withDefaults[key] = param.default;
    }
  }
  return withDefaults;
}

// ── Expression evaluation ────────────────────────────────────────────────────

function stepsAccessor(data: YamlWorkflowData): Record<string, any> {
  const out: Record<string, any> = {};
  const results = data.stepResults || {};
  for (const id of Object.keys(results)) {
    out[id] = results[id]?.outputs ?? {};
  }
  return out;
}

/**
 * Evaluate a workflow-author expression against the workflow data and return its
 * value. `${...}` wrappers are stripped. Errors resolve to undefined.
 *
 * NOTE: like the existing ConditionStep/WhileStep, this uses `new Function`, so
 * expressions are workflow-author-trusted (same risk surface as today).
 */
function evalExpression(expr: any, data: YamlWorkflowData): any {
  if (expr == null) return undefined;
  if (typeof expr !== 'string') return expr;
  let e = expr.trim();
  const tpl = e.match(/^\$\{([\s\S]+)\}$/);
  if (tpl) e = tpl[1].trim();
  if (e.length === 0) return undefined;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'input',
      'inputs',
      'variables',
      'env',
      'steps',
      'stepResults',
      'workflow',
      `"use strict"; try { return (${e}); } catch (e) { return undefined; }`,
    );
    return fn(
      data.inputs,
      data.inputs,
      data.variables,
      data.env,
      stepsAccessor(data),
      data.stepResults,
      data.__workflow,
    );
  } catch {
    return undefined;
  }
}

function evalBoolean(expr: any, data: YamlWorkflowData): boolean {
  return Boolean(evalExpression(expr, data));
}

/** Resolve an expression to an array (for foreach). Non-arrays yield []. */
function resolveArray(expr: any, data: YamlWorkflowData): any[] {
  if (Array.isArray(expr)) return expr;
  const value = evalExpression(expr, data);
  return Array.isArray(value) ? value : [];
}

// ── Ordering ─────────────────────────────────────────────────────────────────

/**
 * Topologically order steps within a scope by `dependsOn`, preserving authored
 * order for independent steps. Dependencies that fall outside the scope (e.g. a
 * nested step depending on an outer step) are ignored for ordering.
 */
function topoSort(steps: AnyStep[]): AnyStep[] {
  const list = Array.isArray(steps) ? steps : [];
  const byId = new Map<string, AnyStep>(list.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: AnyStep[] = [];

  const visit = (step: AnyStep): void => {
    if (visited.has(step.id) || visiting.has(step.id)) return;
    visiting.add(step.id);
    const deps = step.dependsOn
      ? Array.isArray(step.dependsOn)
        ? step.dependsOn
        : [step.dependsOn]
      : [];
    for (const dep of deps) {
      const depStep = byId.get(dep);
      if (depStep) visit(depStep);
    }
    visiting.delete(step.id);
    visited.add(step.id);
    ordered.push(step);
  };

  for (const step of list) visit(step);
  return ordered;
}

// ── Config + attachment ──────────────────────────────────────────────────────

/** Effective config for a step: prefer `config`, fall back to parsed `inputs`. */
function stepConfig(step: AnyStep): Record<string, any> {
  if (step.config && typeof step.config === 'object' && Object.keys(step.config).length > 0) {
    return step.config;
  }
  if (step.inputs && typeof step.inputs === 'object') {
    return step.inputs;
  }
  if (step.inputs && typeof step.inputs === 'string') {
    try {
      return JSON.parse(step.inputs);
    } catch {
      return {};
    }
  }
  return {};
}

/** `Date.now()` indirection so the value is easy to stub in tests. */
function nowMs(): number {
  return Date.now();
}

function applyRetry(stepBuilder: AnyChain, step: AnyStep): AnyChain {
  const rp = step.retryPolicy;
  if (!rp) return stepBuilder;
  const interval = typeof rp.initialDelay === 'number' ? rp.initialDelay : 0;
  const maxRetries = typeof rp.maxAttempts === 'number' ? rp.maxAttempts : undefined;
  return stepBuilder.onError(WorkflowErrorHandling.Retry, interval, maxRetries);
}

/** Attach an ordinary (registry-backed) step as a YamlStepBody leaf. */
function attachLeaf(chain: AnyChain, step: AnyStep, opts: ScopeOpts): AnyChain {
  let sb = chain.then(YamlStepBody, (b: AnyChain) => {
    b.input((s: YamlStepBody) => {
      s.def = step;
      if (opts.itemVariable) s.itemVariable = opts.itemVariable;
      if (opts.indexVariable) s.indexVariable = opts.indexVariable;
    });
  });
  sb = applyRetry(sb, step);
  return sb;
}

/**
 * Prepend a named marker step so a structural combinator's container node is
 * identifiable (the native combinator bodies don't set pointer.stepName). The
 * combinator then attaches to the returned chain.
 */
function markNamed(chain: AnyChain, step: AnyStep): AnyChain {
  return chain.then(NamedMarkerStepBody, (b: AnyChain) => {
    b.input((s: NamedMarkerStepBody) => { s.stepName = step.name || step.id; });
  });
}

/** Attach a single step (leaf or structural) to the chain; returns the new chain. */
function attach(chain: AnyChain, step: AnyStep, opts: ScopeOpts): AnyChain {
  const type = step.type;

  if (!STRUCTURAL_TYPES.has(type)) {
    return attachLeaf(chain, step, opts);
  }

  const config = stepConfig(step);
  // Stamp the container node's entry pointer with the YAML step id so the
  // inspectors / visual designer can map the structural step to its node.
  // wait_event is excluded: its WaitForEventStepBody already stamps the name.
  if (type !== 'wait_event') {
    chain = markNamed(chain, step);
  }

  switch (type) {
    case 'join':
      // Parallel already synchronises; a standalone join is a structural no-op.
      // The named marker above provides the passthrough (and a mapped name).
      return chain;

    case 'condition': {
      const cond = config.condition;
      const thenSteps = config.thenSteps || [];
      const elseSteps = config.elseSteps || [];
      let c = chain
        .if((data: YamlWorkflowData) => evalBoolean(cond, data))
        .do((then: WorkflowBuilder<YamlWorkflowData>) => walk(thenSteps, then, opts));
      if (elseSteps.length > 0) {
        c = c
          .if((data: YamlWorkflowData) => !evalBoolean(cond, data))
          .do((then: WorkflowBuilder<YamlWorkflowData>) => walk(elseSteps, then, opts));
      }
      return c;
    }

    case 'for_each': {
      const itemsExpr = config.items;
      const childOpts: ScopeOpts = {
        itemVariable: config.itemVariable || 'item',
        indexVariable: config.indexVariable,
      };
      const body = config.steps || [];
      return chain
        .foreach((data: YamlWorkflowData) => resolveArray(itemsExpr, data))
        .do((then: WorkflowBuilder<YamlWorkflowData>) => walk(body, then, childOpts));
    }

    case 'while': {
      const cond = config.condition;
      const body = config.steps || [];
      return chain
        .while((data: YamlWorkflowData) => evalBoolean(cond, data))
        .do((then: WorkflowBuilder<YamlWorkflowData>) => walk(body, then, opts));
    }

    case 'parallel': {
      const branches = config.branches || [];
      let p = chain.parallel();
      for (const branch of branches) {
        p = p.do((b: WorkflowBuilder<YamlWorkflowData>) => walk(branch.steps || [], b, opts));
      }
      return p.join();
    }

    case 'saga': {
      const body = config.steps || [];
      const compensate = config.compensate || config.compensateSteps || [];
      let sb = chain.saga((s: WorkflowBuilder<YamlWorkflowData>) => walk(body, s, opts));
      if (Array.isArray(compensate) && compensate.length > 0) {
        sb = sb.compensateWithSequence((c: WorkflowBuilder<YamlWorkflowData>) => walk(compensate, c, opts));
      }
      return sb;
    }

    case 'wait_event': {
      const eventName = config.eventName || config.event || step.id;
      const eventKeyExpr = config.eventKey;
      const timeoutMs = typeof config.timeout === 'number' ? config.timeout : undefined;
      const outputVariable = config.outputVariable;
      // Use the Reactory WaitForEventStepBody (rather than the native
      // chain.waitFor primitive) so the suspended pointer is stamped with the
      // YAML step id — native WaitFor leaves pointer.stepName unset, which makes
      // the waiting step unidentifiable to the inspectors and visual designer.
      let w = chain.then(WaitForEventStepBody, (b: AnyChain) => {
        b.input((s: WaitForEventStepBody, data: YamlWorkflowData) => {
          s.eventName = String(eventName);
          const key = eventKeyExpr != null ? evalExpression(eventKeyExpr, data) : undefined;
          s.eventKey = key == null ? '' : String(key);
          s.effectiveDate = timeoutMs != null ? new Date(nowMs() + timeoutMs) : new Date();
          s.stepName = step.name || step.id;
        });
      });
      if (outputVariable) {
        w = w.output((s: any, data: YamlWorkflowData) => {
          data.variables[outputVariable] = s.eventData;
          data.stepResults[step.id] = { success: true, outputs: { eventData: s.eventData }, metadata: {} };
        });
      }
      return w;
    }

    default:
      return attachLeaf(chain, step, opts);
  }
}

/**
 * Walk a list of steps within a (sub)workflow scope, anchoring with a no-op so
 * control-flow combinators (which attach to a step) always have a predecessor.
 */
function walk(steps: AnyStep[], builder: WorkflowBuilder<YamlWorkflowData>, opts: ScopeOpts): AnyChain {
  let chain: AnyChain = builder.startWith(NoOpStepBody);
  const ordered = topoSort(steps || []);
  for (const step of ordered) {
    if (step.enabled === false) continue;
    chain = attach(chain, step, opts);
  }
  return chain;
}

/**
 * Build a workflow-es WorkflowBase class from a YAML workflow definition.
 * The returned constructor can be registered with the workflow host.
 */
export function buildYamlWorkflowClass(def: {
  nameSpace: string;
  name: string;
  version: string;
  steps: AnyStep[];
}): { new (): WorkflowBase<YamlWorkflowData> } {
  const id = engineWorkflowId(def);
  const version = engineWorkflowMajorVersion(def.version);
  const steps = def.steps || [];

  return class GeneratedYamlWorkflow implements WorkflowBase<YamlWorkflowData> {
    public id: string = id;

    public version: number = version;

    public build(builder: WorkflowBuilder<YamlWorkflowData>): void {
      const chain = walk(steps, builder, {});
      // Happy-path finalize: close the instance log manager once the top-level
      // sequence completes. The FAILURE path is handled out-of-graph by the
      // WorkflowRunner's terminal-status sweeper (a top-level saga would have
      // broken wait_event suspend/resume), so closeInstanceManager is idempotent.
      chain.then(FinalizeStepBody);
    }
  };
}
