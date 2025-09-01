// Export all workflow-related classes and types
export {
  WorkflowScheduler,
  type IScheduleConfig,
  type IScheduledWorkflow,
  type ISchedulerStats
} from './Scheduler/Scheduler';

export {
  ErrorHandler,
  CircuitBreaker,
  type IErrorContext,
  type IRetryConfig,
  type ICircuitBreakerConfig,
  type ITimeoutConfig,
  ErrorCategory,
  ErrorSeverity
} from './ErrorHandler/ErrorHandler';

export {
  WorkflowLifecycleManager,
  WorkflowStatus,
  WorkflowPriority,
  type IWorkflowInstance,
  type IWorkflowDependency,
  type IWorkflowLifecycleConfig,
  type IWorkflowLifecycleStats
} from './LifecycleManager/LifecycleManager';

export {
  ConfigurationManager,
  type IWorkflowConfig,
  type IConfigurationManagerConfig,
  type IConfigurationValidationResult,
  type IConfigurationChangeEvent
} from './ConfigurationManager/ConfigurationManager';

export {
  SecurityManager,
  type IUser,
  type IWorkflowPermission,
  type IAuditLogEntry,
  type ISecurityEvent,
  type ISecurityManagerConfig,
  type IInputValidationResult,
  type IRateLimitInfo
} from './SecurityManager/SecurityManager';


import Routes from './routes';
export default Routes
