/**
 * Type definitions for YAML Workflow Execution
 * Defines interfaces and types for workflow execution engine
 */

import { StepExecutionResult } from '../../steps/interfaces/IYamlStep';

/**
 * Workflow execution states
 */
export enum ExecutionState {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Workflow execution context passed to steps
 */
export interface WorkflowExecutionContext {
  /** Workflow inputs provided at execution time */
  inputs: Record<string, any>;
  
  /** Environment variables available to the workflow */
  environment: Record<string, any>;
  
  /** Outputs from previously executed steps */
  stepOutputs: Record<string, any>;
  
  /** Workflow metadata */
  workflow: {
    name: string;
    namespace: string;
    version: string;
    executionId: string;
  };
  
  /** Current execution state */
  execution: {
    startTime: Date;
    currentStep?: string;
    completedSteps: string[];
    totalSteps: number;
  };
}

/**
 * Result of step execution with metadata
 */
export interface StepExecutionRecord {
  /** Step identifier */
  stepId: string;
  
  /** Step type */
  stepType: string;
  
  /** Execution success flag */
  success: boolean;
  
  /** Step outputs */
  outputs: Record<string, any>;
  
  /** Execution metadata */
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    executionId: string;
  };
  
  /** Error information if step failed */
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Overall workflow execution result
 */
export interface WorkflowExecutionResult {
  /** Overall success flag */
  success: boolean;
  
  /** Execution was cancelled */
  cancelled?: boolean;
  
  /** List of executed steps with results */
  executedSteps: StepExecutionRecord[];
  
  /** Workflow outputs (from final step or aggregated) */
  outputs: Record<string, any>;
  
  /** Execution metadata */
  metadata: {
    executionId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
  };
  
  /** Primary error if workflow failed */
  error?: {
    message: string;
    stack?: string;
    code?: string;
    stepId?: string;
  };
  
  /** Collection of all errors from failed steps */
  errors?: Array<{
    stepId: string;
    message: string;
    stack?: string;
    code?: string;
  }>;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  /** Validation success flag */
  valid: boolean;
  
  /** List of validation errors */
  errors: Array<{
    message: string;
    path?: string;
    code?: string;
    stepId?: string;
  }>;
  
  /** List of validation warnings */
  warnings?: Array<{
    message: string;
    path?: string;
    code?: string;
    stepId?: string;
  }>;
}

/**
 * Execution progress event types
 */
export type ProgressEventType = 
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_cancelled'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'step_skipped';

/**
 * Progress event data
 */
export interface ProgressEvent {
  /** Event type */
  type: ProgressEventType;
  
  /** Timestamp of event */
  timestamp: Date;
  
  /** Overall progress percentage (0-100) */
  progress: number;
  
  /** Current step information (if applicable) */
  step?: {
    id: string;
    type: string;
    name?: string;
  };
  
  /** Event message */
  message?: string;
  
  /** Additional event data */
  data?: Record<string, any>;
}

/**
 * Execution options for workflow
 */
export interface ExecutionOptions {
  /** Progress callback function */
  onProgress?: (event: ProgressEvent) => void;
  
  /** Continue execution on step failures */
  continueOnError?: boolean;
  
  /** Maximum execution timeout in milliseconds */
  timeout?: number;
  
  /** Execution inputs to override workflow defaults */
  inputs?: Record<string, any>;
  
  /** Environment variables for execution */
  environment?: Record<string, any>;
  
  /** Dry run mode - validate without executing */
  dryRun?: boolean;
}

/**
 * Current execution state snapshot
 */
export interface ExecutionStateSnapshot {
  /** Current execution status */
  status: ExecutionState;
  
  /** Current step being executed */
  currentStep: string | null;
  
  /** List of completed step IDs */
  completedSteps: string[];
  
  /** List of failed step IDs */
  failedSteps: string[];
  
  /** Execution start time */
  startTime: Date | null;
  
  /** Progress percentage */
  progress: number;
  
  /** Total number of steps */
  totalSteps: number;
  
  /** Execution ID */
  executionId: string | null;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
  /** Successfully resolved execution order */
  executionOrder: string[];
  
  /** Validation success */
  valid: boolean;
  
  /** Dependency errors */
  errors: Array<{
    message: string;
    stepId: string;
    dependency?: string;
  }>;
}

/**
 * Step creation error
 */
export interface StepCreationError {
  stepId: string;
  stepType: string;
  message: string;
  cause?: Error;
}
