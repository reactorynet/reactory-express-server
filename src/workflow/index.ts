import express from 'express';
import { WorkflowRunner, DefaultWorkflows } from './WorkflowRunner';
import logger from '../logging';

// Export all workflow-related classes and types
export {
  WorkflowScheduler,
  type IScheduleConfig,
  type IScheduledWorkflow,
  type ISchedulerStats
} from './WorkflowRunner/Scheduler';

export {
  ErrorHandler,
  CircuitBreaker,
  type IErrorContext,
  type IRetryConfig,
  type ICircuitBreakerConfig,
  type ITimeoutConfig,
  ErrorCategory,
  ErrorSeverity
} from './WorkflowRunner/ErrorHandler';

export {
  WorkflowLifecycleManager,
  WorkflowStatus,
  WorkflowPriority,
  type IWorkflowInstance,
  type IWorkflowDependency,
  type IWorkflowLifecycleConfig,
  type IWorkflowLifecycleStats
} from './WorkflowRunner/LifecycleManager';

export {
  ConfigurationManager,
  type IWorkflowConfig,
  type IConfigurationManagerConfig,
  type IConfigurationValidationResult,
  type IConfigurationChangeEvent
} from './WorkflowRunner/ConfigurationManager';

export {
  SecurityManager,
  type IUser,
  type IWorkflowPermission,
  type IAuditLogEntry,
  type ISecurityEvent,
  type ISecurityManagerConfig,
  type IInputValidationResult,
  type IRateLimitInfo
} from './WorkflowRunner/SecurityManager';

const router = express.Router();
// Create a singleton instance of the WorkflowRunner
export const workflowRunner = new WorkflowRunner({ workflows: DefaultWorkflows });

// Initialize the workflow runner
workflowRunner.initialize().catch((error) => {
  logger.error('Failed to initialize WorkflowRunner', error);
});

router.get('/status', (req, res) => {
  return res.send({ all: 'good' });
});

router.post('/start/:workflowId', (req, res) => {
  const version = typeof req.query.version === 'string' ? req.query.version : '1';
  workflowRunner.startWorkflow(req.params.workflowId, version, { ...req.query, ...req.body });
  return res.send({ result: 'started' });
});

export default router;
