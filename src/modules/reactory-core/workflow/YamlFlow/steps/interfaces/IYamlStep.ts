/**
 * Core interfaces for YAML workflow step system.
 * Re-exports from shared @reactorynet/reactory-core types for backward compatibility.
 *
 * The `control` extensions below (StepControlDirective / IStepControlContext) are
 * declared HERE rather than in @reactorynet/reactory-core because the server pins a
 * published version of that package; they are upstreamed into
 * `reactory-core/src/types/workflow/index.d.ts` on the next core release, after which
 * these local declarations become simple re-exports.
 */

import Reactory from '@reactorynet/reactory-core';

// Re-export from shared types — all existing imports continue to work
export type StepExecutionContext = Reactory.Workflow.IStepExecutionContext & {
  /** Durable-engine control channel. Absent in bare test/CLI contexts. */
  control?: IStepControlContext;
};
export type ValidationResult = Reactory.Workflow.IStepValidationResult;
export type IYamlStep = Reactory.Workflow.IYamlStep;
export type StepConstructor = Reactory.Workflow.IStepConstructor;
export type StepRegistrationOptions = Reactory.Workflow.IStepRegistrationOptions;
export type StepMetadata = Reactory.Workflow.IStepMetadata;

/**
 * A step's request for durable engine control AFTER it returns.
 *
 * Only the durable execution path (YamlStepBody → workflow-es) can honour these;
 * the standalone YamlWorkflowExecutor reports `supportsSuspend: false` and fails a
 * step that asks for suspension anyway. Steps that can work either way MUST check
 * `context.control?.supportsSuspend` and degrade themselves.
 *
 * Exactly one directive is honoured per result; when more than one is present,
 * `waitForEvent` wins over `sleep`.
 */
export interface StepControlDirective {
  /**
   * Suspend this step until `(eventName, eventKey)` is published (via
   * `core.ReactoryWorkflowService@1.0.0.publishWorkflowEvent` or
   * `WorkflowRunner.publishEvent`). The SAME step body re-runs on resume, with
   * `context.control.eventPublished === true` and the payload in
   * `context.control.eventData`.
   *
   * NOTE: no `persist` is carried across an event suspend — the engine's
   * `ExecutionResult.waitForEvent()` has no persistenceData channel. Write anything
   * the resumed run needs into the step's own `outputs`: they are recorded into the
   * workflow instance BEFORE the suspend and are readable on resume via
   * `context.stepResults[<stepId>].outputs`.
   */
  waitForEvent?: {
    eventName: string;
    eventKey: string;
  };
  /**
   * Suspend for a duration (or until an instant), then re-run this same step.
   * Survives a process restart — the engine's poll worker re-queues the instance
   * when the sleep expires. Use for durable polling of an external system.
   */
  sleep?: {
    /** Milliseconds from now. Ignored when `until` is supplied. */
    durationMs?: number;
    /** ISO-8601 instant to sleep until. */
    until?: string;
  };
  /**
   * Opaque state restored as `context.control.persistenceData` on the re-run.
   * Honoured for `sleep` only (see the note on `waitForEvent`).
   */
  persist?: Record<string, any>;
}

/**
 * The durable-control channel exposed to a step during execution.
 */
export interface IStepControlContext {
  /**
   * True when the executing engine can honour a StepControlDirective. False on the
   * standalone YamlWorkflowExecutor — steps must fall back to in-step behaviour.
   */
  supportsSuspend: boolean;
  /** True on the run that follows a satisfied `waitForEvent`. */
  eventPublished: boolean;
  /** Payload delivered with the event that resumed this step. */
  eventData?: any;
  /** State carried by a previous directive's `persist` (sleep only). */
  persistenceData?: any;
}

/**
 * Result returned by a YAML step execution, extended with the optional durable
 * control directive.
 */
export type StepExecutionResult = Reactory.Workflow.IYamlStepExecutionResult & {
  control?: StepControlDirective;
};
