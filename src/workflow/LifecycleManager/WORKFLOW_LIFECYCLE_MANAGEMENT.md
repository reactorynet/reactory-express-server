# Workflow Lifecycle Management

## Overview

The WorkflowRunner now includes comprehensive lifecycle management capabilities that provide complete control over workflow execution, status tracking, pause/resume functionality, cleanup mechanisms, and dependency management. This ensures robust workflow orchestration and resource management.

## Features

### ✅ Implemented Features

1. **Workflow Status Tracking**
   - Real-time status monitoring
   - Status transitions with validation
   - Timestamp tracking for all state changes
   - Status history and audit trail

2. **Workflow Pause/Resume Functionality**
   - Pause running workflows
   - Resume paused workflows
   - State preservation during pause
   - Resource management during pause

3. **Workflow Cleanup Mechanisms**
   - Automatic cleanup of completed workflows
   - Configurable retention periods
   - Resource cleanup tasks
   - Memory and disk cleanup

4. **Workflow Dependency Management**
   - Complex dependency relationships
   - Conditional dependencies (completed, failed, any)
   - Dependency timeout handling
   - Automatic dependency resolution

5. **Workflow Priority Management**
   - Priority-based execution
   - Resource allocation by priority
   - Priority-based scheduling
   - Priority inheritance

6. **Resource Usage Monitoring**
   - Memory usage tracking
   - CPU usage monitoring
   - Disk usage tracking
   - Resource threshold management

7. **Workflow Statistics and Metrics**
   - Execution time tracking
   - Success/failure rates
   - Resource utilization metrics
   - Performance analytics

8. **Event-Driven Lifecycle Management**
   - Real-time event emission
   - Event-based integrations
   - Custom event handlers
   - Lifecycle hooks

## Architecture

```
WorkflowLifecycleManager
├── Workflow Instance Management
│   ├── Status Tracking (PENDING → RUNNING → COMPLETED/FAILED)
│   ├── Priority Management (LOW → NORMAL → HIGH → CRITICAL)
│   ├── Resource Monitoring (Memory, CPU, Disk)
│   └── Metadata Management
├── Dependency Management
│   ├── Dependency Graph
│   ├── Conditional Dependencies
│   ├── Dependency Resolution
│   └── Circular Dependency Detection
├── Lifecycle Operations
│   ├── Start/Pause/Resume/Complete/Fail/Cancel
│   ├── State Validation
│   ├── Resource Checks
│   └── Event Emission
├── Cleanup Management
│   ├── Automatic Cleanup
│   ├── Retention Policies
│   ├── Resource Cleanup
│   └── Cleanup Tasks
└── Statistics and Monitoring
    ├── Real-time Statistics
    ├── Performance Metrics
    ├── Resource Utilization
    └── Health Monitoring
```

## Workflow Statuses

### Status Flow
```
PENDING → RUNNING → COMPLETED
         ↓
         PAUSED → RESUMED → RUNNING
         ↓
         FAILED
         ↓
         CANCELLED
```

### Status Descriptions

- **PENDING**: Workflow is created and waiting to start
- **RUNNING**: Workflow is actively executing
- **PAUSED**: Workflow is temporarily suspended
- **COMPLETED**: Workflow finished successfully
- **FAILED**: Workflow encountered an error
- **CANCELLED**: Workflow was manually cancelled
- **CLEANING_UP**: Workflow is being cleaned up

## Workflow Priorities

### Priority Levels

- **LOW (1)**: Background tasks, non-critical workflows
- **NORMAL (2)**: Standard workflows, default priority
- **HIGH (3)**: Important workflows, priority execution
- **CRITICAL (4)**: Critical workflows, immediate execution

### Priority-Based Features

- **Resource Allocation**: Higher priority workflows get resources first
- **Execution Order**: Critical workflows execute before normal workflows
- **Resource Limits**: Priority-based resource limits
- **Timeout Handling**: Different timeouts per priority level

## Configuration

### Default Configuration

```typescript
const defaultConfig: IWorkflowLifecycleConfig = {
  maxConcurrentWorkflows: 10,
  maxWorkflowDuration: 3600000, // 1 hour
  cleanupInterval: 300000, // 5 minutes
  statusUpdateInterval: 60000, // 1 minute
  dependencyTimeout: 300000, // 5 minutes
  resourceThresholds: {
    memory: 512, // 512 MB
    cpu: 80, // 80%
    disk: 1024, // 1 GB
  },
};
```

### Custom Configuration

```typescript
import { WorkflowLifecycleManager } from './LifecycleManager';

const customConfig: IWorkflowLifecycleConfig = {
  maxConcurrentWorkflows: 20,
  maxWorkflowDuration: 7200000, // 2 hours
  cleanupInterval: 600000, // 10 minutes
  statusUpdateInterval: 30000, // 30 seconds
  dependencyTimeout: 600000, // 10 minutes
  resourceThresholds: {
    memory: 1024, // 1 GB
    cpu: 90, // 90%
    disk: 2048, // 2 GB
  },
};

const lifecycleManager = new WorkflowLifecycleManager(customConfig);
```

## Usage

### Basic Workflow Lifecycle

```typescript
import { WorkflowRunner, WorkflowPriority } from './WorkflowRunner';

const workflowRunner = new WorkflowRunner({ workflows: DefaultWorkflows });
await workflowRunner.initialize();

// Create a workflow instance
const instance = workflowRunner.createWorkflowInstance(
  'workflow.id',
  '1.0.0',
  WorkflowPriority.HIGH
);

// Start the workflow
await workflowRunner.startWorkflowInstance(instance.id);

// Pause the workflow
workflowRunner.pauseWorkflowInstance(instance.id);

// Resume the workflow
workflowRunner.resumeWorkflowInstance(instance.id);

// Complete the workflow
workflowRunner.completeWorkflowInstance(instance.id, { result: 'success' });
```

### Dependency Management

```typescript
// Create dependent workflows
const dataProcessingWorkflow = workflowRunner.createWorkflowInstance(
  'data.processing',
  '1.0.0'
);

const reportingWorkflow = workflowRunner.createWorkflowInstance(
  'reporting',
  '1.0.0'
);

// Add dependency: reporting depends on data processing completion
workflowRunner.addWorkflowDependency(
  reportingWorkflow.id,
  dataProcessingWorkflow.id,
  'completed'
);

// Start the dependency workflow
await workflowRunner.startWorkflowInstance(dataProcessingWorkflow.id);

// The dependent workflow will start automatically when dependency completes
workflowRunner.completeWorkflowInstance(dataProcessingWorkflow.id);
```

### Priority-Based Execution

```typescript
// Create workflows with different priorities
const lowPriorityWorkflow = workflowRunner.createWorkflowInstance(
  'background.task',
  '1.0.0',
  WorkflowPriority.LOW
);

const criticalWorkflow = workflowRunner.createWorkflowInstance(
  'critical.task',
  '1.0.0',
  WorkflowPriority.CRITICAL
);

// Critical workflow will get resources first
await workflowRunner.startWorkflowInstance(criticalWorkflow.id);
await workflowRunner.startWorkflowInstance(lowPriorityWorkflow.id);
```

### Workflow Queries

```typescript
// Get all workflow instances
const allWorkflows = workflowRunner.getAllWorkflowInstances();

// Get workflows by status
const runningWorkflows = workflowRunner.getWorkflowsByStatus(WorkflowStatus.RUNNING);
const pausedWorkflows = workflowRunner.getWorkflowsByStatus(WorkflowStatus.PAUSED);

// Get workflows by priority
const highPriorityWorkflows = workflowRunner.getWorkflowsByPriority(WorkflowPriority.HIGH);

// Get specific workflow instance
const workflow = workflowRunner.getWorkflowInstance('workflow-instance-id');
```

### Statistics and Monitoring

```typescript
// Get lifecycle statistics
const stats = workflowRunner.getLifecycleStats();

console.log({
  totalWorkflows: stats.totalWorkflows,
  runningWorkflows: stats.runningWorkflows,
  completedWorkflows: stats.completedWorkflows,
  averageExecutionTime: stats.averageExecutionTime,
  resourceUtilization: stats.resourceUtilization,
});
```

## Dependency Management

### Dependency Types

1. **Completed Dependency**: Workflow waits for dependency to complete successfully
2. **Failed Dependency**: Workflow waits for dependency to fail
3. **Any Dependency**: Workflow waits for dependency to either complete or fail

### Dependency Configuration

```typescript
// Simple dependency
workflowRunner.addWorkflowDependency(
  dependentWorkflow.id,
  dependencyWorkflow.id,
  'completed'
);

// Dependency with timeout
workflowRunner.addWorkflowDependency(
  dependentWorkflow.id,
  dependencyWorkflow.id,
  'completed',
  300000 // 5 minutes timeout
);

// Failed dependency
workflowRunner.addWorkflowDependency(
  fallbackWorkflow.id,
  mainWorkflow.id,
  'failed'
);

// Any dependency
workflowRunner.addWorkflowDependency(
  notificationWorkflow.id,
  processingWorkflow.id,
  'any'
);
```

### Complex Dependencies

```typescript
// Multiple dependencies
const workflow1 = workflowRunner.createWorkflowInstance('workflow1', '1.0.0');
const workflow2 = workflowRunner.createWorkflowInstance('workflow2', '1.0.0');
const workflow3 = workflowRunner.createWorkflowInstance('workflow3', '1.0.0');

// Workflow3 depends on both workflow1 and workflow2
workflowRunner.addWorkflowDependency(workflow3.id, workflow1.id, 'completed');
workflowRunner.addWorkflowDependency(workflow3.id, workflow2.id, 'completed');

// Workflow3 will only start when both workflow1 and workflow2 complete
```

## Resource Management

### Resource Monitoring

```typescript
// Get resource utilization
const stats = workflowRunner.getLifecycleStats();
const { memory, cpu, disk } = stats.resourceUtilization;

console.log(`Memory: ${memory}MB, CPU: ${cpu}%, Disk: ${disk}MB`);
```

### Resource Thresholds

```typescript
// Configure resource thresholds
const config = {
  resourceThresholds: {
    memory: 1024, // 1 GB
    cpu: 80, // 80%
    disk: 2048, // 2 GB
  },
};

const lifecycleManager = new WorkflowLifecycleManager(config);
```

### Resource-Based Scheduling

```typescript
// Check if resources are available
const stats = workflowRunner.getLifecycleStats();
const { memory, cpu, disk } = stats.resourceUtilization;

if (memory < 512 && cpu < 80) {
  // Start new workflow
  await workflowRunner.startWorkflowInstance(workflow.id);
} else {
  // Wait for resources
  console.log('Insufficient resources');
}
```

## Event-Driven Architecture

### Available Events

```typescript
// Lifecycle events
lifecycleManager.on('workflowCreated', (instance) => {
  console.log('Workflow created:', instance.id);
});

lifecycleManager.on('workflowStarted', (instance) => {
  console.log('Workflow started:', instance.id);
});

lifecycleManager.on('workflowPaused', (instance) => {
  console.log('Workflow paused:', instance.id);
});

lifecycleManager.on('workflowResumed', (instance) => {
  console.log('Workflow resumed:', instance.id);
});

lifecycleManager.on('workflowCompleted', (instance) => {
  console.log('Workflow completed:', instance.id);
});

lifecycleManager.on('workflowFailed', (instance, error) => {
  console.log('Workflow failed:', instance.id, error);
});

lifecycleManager.on('workflowCancelled', (instance, reason) => {
  console.log('Workflow cancelled:', instance.id, reason);
});

lifecycleManager.on('workflowReady', (instance) => {
  console.log('Workflow ready to start:', instance.id);
});

lifecycleManager.on('workflowCleanedUp', (instance) => {
  console.log('Workflow cleaned up:', instance.id);
});
```

### Custom Event Handlers

```typescript
// Custom event handling
lifecycleManager.on('workflowCompleted', (instance) => {
  // Send notification
  sendNotification(`Workflow ${instance.workflowId} completed`);
  
  // Update dashboard
  updateDashboard(instance);
  
  // Trigger dependent workflows
  triggerDependentWorkflows(instance.id);
});
```

## Cleanup Management

### Automatic Cleanup

```typescript
// Configure cleanup intervals
const config = {
  cleanupInterval: 300000, // 5 minutes
  maxWorkflowDuration: 3600000, // 1 hour
};

const lifecycleManager = new WorkflowLifecycleManager(config);
```

### Manual Cleanup

```typescript
// Manual cleanup
await lifecycleManager.cleanup();

// Clean up specific workflows
const workflowsToCleanup = lifecycleManager.getWorkflowsByStatus(WorkflowStatus.COMPLETED);
for (const workflow of workflowsToCleanup) {
  await lifecycleManager.cleanupWorkflow(workflow.id);
}
```

### Cleanup Policies

```typescript
// Custom cleanup policies
const cleanupPolicies = {
  completed: 24 * 60 * 60 * 1000, // 24 hours
  failed: 7 * 24 * 60 * 60 * 1000, // 7 days
  cancelled: 1 * 60 * 60 * 1000, // 1 hour
};
```

## Performance Monitoring

### Execution Metrics

```typescript
// Get execution metrics
const stats = workflowRunner.getLifecycleStats();

console.log({
  averageExecutionTime: stats.averageExecutionTime,
  totalWorkflows: stats.totalWorkflows,
  successRate: stats.completedWorkflows / stats.totalWorkflows,
  failureRate: stats.failedWorkflows / stats.totalWorkflows,
});
```

### Resource Metrics

```typescript
// Monitor resource usage
const stats = workflowRunner.getLifecycleStats();
const { memory, cpu, disk } = stats.resourceUtilization;

// Alert if resources are high
if (memory > 80 || cpu > 80 || disk > 80) {
  sendAlert('High resource utilization detected');
}
```

## Error Handling

### Workflow Failures

```typescript
// Handle workflow failures
lifecycleManager.on('workflowFailed', (instance, error) => {
  console.error('Workflow failed:', instance.id, error);
  
  // Retry logic
  if (instance.metadata?.retryCount < 3) {
    retryWorkflow(instance.id);
  } else {
    // Escalate to manual intervention
    escalateToManual(instance.id, error);
  }
});
```

### Dependency Failures

```typescript
// Handle dependency failures
lifecycleManager.on('workflowFailed', (instance, error) => {
  // Check if this failure affects dependent workflows
  const dependents = instance.dependents;
  
  for (const dependentId of dependents) {
    const dependent = lifecycleManager.getWorkflowInstance(dependentId);
    if (dependent && dependent.status === WorkflowStatus.PENDING) {
      // Cancel dependent workflow or implement fallback
      lifecycleManager.cancelWorkflow(dependentId, 'Dependency failed');
    }
  }
});
```

## Best Practices

### Workflow Design

1. **Use Appropriate Priorities**
   - Use CRITICAL only for essential workflows
   - Use HIGH for important workflows
   - Use NORMAL for standard workflows
   - Use LOW for background tasks

2. **Manage Dependencies Carefully**
   - Avoid circular dependencies
   - Use timeouts for dependencies
   - Implement fallback mechanisms
   - Monitor dependency chains

3. **Resource Management**
   - Monitor resource usage
   - Set appropriate thresholds
   - Implement resource cleanup
   - Use priority-based resource allocation

4. **Error Handling**
   - Implement retry logic
   - Handle dependency failures
   - Monitor and alert on failures
   - Implement graceful degradation

### Performance Optimization

1. **Efficient Cleanup**
   - Configure appropriate cleanup intervals
   - Use retention policies
   - Implement selective cleanup
   - Monitor cleanup performance

2. **Resource Optimization**
   - Monitor resource usage patterns
   - Implement resource pooling
   - Use priority-based scheduling
   - Optimize memory usage

3. **Event Handling**
   - Use efficient event handlers
   - Implement event filtering
   - Monitor event processing
   - Handle event failures

## API Reference

### WorkflowLifecycleManager

```typescript
class WorkflowLifecycleManager {
  constructor(config?: Partial<IWorkflowLifecycleConfig>);
  
  // Lifecycle operations
  initialize(): Promise<void>;
  createWorkflowInstance(workflowId: string, version: string, priority?: WorkflowPriority, dependencies?: IWorkflowDependency[], metadata?: Record<string, any>): IWorkflowInstance;
  startWorkflow(instanceId: string): Promise<void>;
  pauseWorkflow(instanceId: string): void;
  resumeWorkflow(instanceId: string): void;
  completeWorkflow(instanceId: string, result?: any): void;
  failWorkflow(instanceId: string, error: Error): void;
  cancelWorkflow(instanceId: string, reason?: string): void;
  
  // Queries
  getWorkflowInstance(instanceId: string): IWorkflowInstance | undefined;
  getAllWorkflowInstances(): IWorkflowInstance[];
  getWorkflowsByStatus(status: WorkflowStatus): IWorkflowInstance[];
  getWorkflowsByPriority(priority: WorkflowPriority): IWorkflowInstance[];
  
  // Dependencies
  addDependency(dependentId: string, dependencyId: string, condition?: 'completed' | 'failed' | 'any', timeout?: number): void;
  removeDependency(dependentId: string, dependencyId: string): void;
  
  // Statistics
  getStats(): IWorkflowLifecycleStats;
  
  // Cleanup
  cleanup(): Promise<void>;
  
  // Lifecycle
  stop(): Promise<void>;
  isInitialized(): boolean;
}
```

### Interfaces

```typescript
interface IWorkflowInstance {
  id: string;
  workflowId: string;
  version: string;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  cancelledAt?: Date;
  error?: Error;
  metadata?: Record<string, any>;
  dependencies: string[];
  dependents: string[];
  cleanupTasks: string[];
  resourceUsage: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

interface IWorkflowDependency {
  workflowId: string;
  version: string;
  condition: 'completed' | 'failed' | 'any';
  timeout?: number;
}

interface IWorkflowLifecycleConfig {
  maxConcurrentWorkflows: number;
  maxWorkflowDuration: number;
  cleanupInterval: number;
  statusUpdateInterval: number;
  dependencyTimeout: number;
  resourceThresholds: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

interface IWorkflowLifecycleStats {
  totalWorkflows: number;
  runningWorkflows: number;
  pausedWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  cancelledWorkflows: number;
  averageExecutionTime: number;
  resourceUtilization: {
    memory: number;
    cpu: number;
    disk: number;
  };
}
```

### Enums

```typescript
enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  CLEANING_UP = 'cleaning_up',
}

enum WorkflowPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}
```

## Migration Guide

### From Basic Workflow Management

**Before:**
```typescript
// Basic workflow execution
await workflowRunner.startWorkflow('workflow.id', '1.0.0', data);
```

**After:**
```typescript
// Lifecycle-managed workflow execution
const instance = workflowRunner.createWorkflowInstance('workflow.id', '1.0.0');
await workflowRunner.startWorkflowInstance(instance.id);
workflowRunner.completeWorkflowInstance(instance.id, result);
```

### From Manual Dependency Management

**Before:**
```typescript
// Manual dependency handling
await workflow1();
await workflow2();
await workflow3();
```

**After:**
```typescript
// Automated dependency management
const workflow1 = workflowRunner.createWorkflowInstance('workflow1', '1.0.0');
const workflow2 = workflowRunner.createWorkflowInstance('workflow2', '1.0.0');
const workflow3 = workflowRunner.createWorkflowInstance('workflow3', '1.0.0');

workflowRunner.addWorkflowDependency(workflow3.id, workflow1.id, 'completed');
workflowRunner.addWorkflowDependency(workflow3.id, workflow2.id, 'completed');

await workflowRunner.startWorkflowInstance(workflow1.id);
await workflowRunner.startWorkflowInstance(workflow2.id);
// workflow3 starts automatically when dependencies complete
```

## Future Enhancements

### Planned Features

1. **Advanced Dependency Management**
   - Complex dependency graphs
   - Conditional dependencies
   - Dependency timeouts
   - Circular dependency detection

2. **Enhanced Resource Management**
   - Dynamic resource allocation
   - Resource prediction
   - Resource optimization
   - Resource scaling

3. **Advanced Monitoring**
   - Real-time dashboards
   - Performance analytics
   - Predictive monitoring
   - Alert management

4. **Workflow Orchestration**
   - Workflow templates
   - Workflow composition
   - Workflow versioning
   - Workflow migration

## License

This workflow lifecycle management is part of the Reactory system and follows the same licensing terms. 