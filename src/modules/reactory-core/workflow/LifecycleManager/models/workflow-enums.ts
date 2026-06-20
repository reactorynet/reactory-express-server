/**
 * Workflow-ES status and execution-pointer enums plus their label helpers.
 *
 * Previously embedded in WorkflowInstanceModel.ts (the mongoose model).
 * Extracted here so they can be imported without pulling in mongoose once the
 * mongoose model is retired (M9 Phase 2).
 *
 * Numeric values MUST match the values used by the workflow-es engine (see
 * @reactorynet/workflow-es WorkflowStatus and PointerStatus).
 */

/**
 * Workflow-ES Status Enum
 * These values correspond to the workflow-es library's internal status codes.
 * NOTE: The workflow-es engine uses WorkflowStatus = { Runnable:0, Suspended:1, Complete:2, Terminated:3 }
 * We map PENDING→Runnable (0), RUNNABLE→Runnable (0 in older docs), COMPLETE→Complete (2), etc.
 * for backward-compat the enum values remain unchanged here.
 */
export enum WorkflowESStatus {
  PENDING = 0,
  RUNNABLE = 1,
  COMPLETE = 2,
  TERMINATED = 3,
  SUSPENDED = 4,
}

/**
 * Execution Pointer Status Enum
 * Status values for individual step execution pointers.
 * Values match PointerStatus from @reactorynet/workflow-es.
 */
export enum ExecutionPointerStatus {
  LEGACY = 0,
  PENDING = 1,
  RUNNING = 2,
  COMPLETE = 3,
  SLEEPING = 4,
  WAITING_FOR_EVENT = 5,
  FAILED = 6,
  COMPENSATED = 7,
  CANCELLED = 8,
}

/**
 * Helper function to map WorkflowESStatus to human-readable string
 */
export function getStatusLabel(status: WorkflowESStatus): string {
  switch (status) {
    case WorkflowESStatus.PENDING:
      return 'Pending';
    case WorkflowESStatus.RUNNABLE:
      return 'Running';
    case WorkflowESStatus.COMPLETE:
      return 'Complete';
    case WorkflowESStatus.TERMINATED:
      return 'Terminated';
    case WorkflowESStatus.SUSPENDED:
      return 'Suspended';
    default:
      return 'Unknown';
  }
}

/**
 * Helper function to get execution pointer status label
 */
export function getExecutionPointerStatusLabel(status: ExecutionPointerStatus): string {
  switch (status) {
    case ExecutionPointerStatus.LEGACY:
      return 'Legacy';
    case ExecutionPointerStatus.PENDING:
      return 'Pending';
    case ExecutionPointerStatus.RUNNING:
      return 'Running';
    case ExecutionPointerStatus.COMPLETE:
      return 'Complete';
    case ExecutionPointerStatus.SLEEPING:
      return 'Sleeping';
    case ExecutionPointerStatus.WAITING_FOR_EVENT:
      return 'Waiting for Event';
    case ExecutionPointerStatus.FAILED:
      return 'Failed';
    case ExecutionPointerStatus.COMPENSATED:
      return 'Compensated';
    case ExecutionPointerStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}
