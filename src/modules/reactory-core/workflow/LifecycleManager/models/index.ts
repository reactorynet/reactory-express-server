// M9 Phase 2: WorkflowInstanceModel (mongoose) has been retired.
// Only the enum/helper types remain; they are used by LifecycleManager and
// WorkflowRunner without any mongoose dependency.
export {
  WorkflowESStatus,
  ExecutionPointerStatus,
  getStatusLabel,
  getExecutionPointerStatusLabel,
} from './workflow-enums';
