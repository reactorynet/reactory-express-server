/**
 * Type definitions for YAML Workflow Execution.
 * Re-exports from shared @reactorynet/reactory-core types for backward compatibility.
 */

import Reactory from '@reactorynet/reactory-core';

/**
 * Workflow execution states.
 * Const object preserves the enum-like access pattern (ExecutionState.RUNNING)
 * while the underlying type is a string literal union from reactory-core.
 */
export const ExecutionState = {
  IDLE: 'idle' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
};

export type ExecutionState = Reactory.Workflow.ExecutionState;

// Re-export execution types from shared core
export type WorkflowExecutionContext = Reactory.Workflow.IExecutorWorkflowContext;
export type StepExecutionRecord = Reactory.Workflow.IStepExecutionRecord;
export type WorkflowExecutionResult = Reactory.Workflow.IWorkflowExecutionResult;
export type WorkflowValidationResult = Reactory.Workflow.IWorkflowValidationResult;
export type ProgressEventType = Reactory.Workflow.ProgressEventType;
export type ProgressEvent = Reactory.Workflow.IProgressEvent;
export type ExecutionOptions = Reactory.Workflow.IExecutionOptions;
export type ExecutionStateSnapshot = Reactory.Workflow.IExecutionStateSnapshot;
export type DependencyResolutionResult = Reactory.Workflow.IDependencyResolutionResult;
export type StepCreationError = Reactory.Workflow.IStepCreationError;
