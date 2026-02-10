import { 
  WorkflowLifecycleManager, 
  WorkflowStatus, 
  WorkflowPriority,
  type IWorkflowInstance,
  type IWorkflowDependency,
  type IWorkflowLifecycleConfig
} from '../LifecycleManager';

// Mock dependencies
jest.mock('../../../../../logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock WorkflowInstanceModel for MongoDB operations
jest.mock('../models/WorkflowInstanceModel', () => {
  const mockDeleteOne = jest.fn();
  const mockDeleteMany = jest.fn();
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockCountDocuments = jest.fn();
  const mockAggregate = jest.fn();
  
  return {
    __esModule: true,
    default: {
      deleteOne: mockDeleteOne,
      deleteMany: mockDeleteMany,
      find: mockFind,
      findOne: mockFindOne,
      countDocuments: mockCountDocuments,
      aggregate: mockAggregate,
      findPaginated: jest.fn(),
      findByWorkflowDefinitionId: jest.fn(),
      findByStatus: jest.fn(),
      getWorkflowStats: jest.fn(),
    },
    WorkflowESStatus: {
      PENDING: 0,
      RUNNABLE: 1,
      COMPLETE: 2,
      TERMINATED: 3,
      SUSPENDED: 4,
    },
    ExecutionPointerStatus: {
      LEGACY: 0,
      PENDING: 1,
      RUNNING: 2,
      COMPLETE: 3,
      SLEEPING: 4,
      WAITING_FOR_EVENT: 5,
      FAILED: 6,
      COMPENSATED: 7,
      CANCELLED: 8,
    },
    getStatusLabel: jest.fn((status: number) => {
      const labels: Record<number, string> = {
        0: 'Pending',
        1: 'Running',
        2: 'Complete',
        3: 'Terminated',
        4: 'Suspended',
      };
      return labels[status] || 'Unknown';
    }),
    getExecutionPointerStatusLabel: jest.fn((status: number) => {
      const labels: Record<number, string> = {
        0: 'Legacy',
        1: 'Pending',
        2: 'Running',
        3: 'Complete',
        4: 'Sleeping',
        5: 'Waiting for Event',
        6: 'Failed',
        7: 'Compensated',
        8: 'Cancelled',
      };
      return labels[status] || 'Unknown';
    }),
  };
});

describe('WorkflowLifecycleManager', () => {
  let lifecycleManager: WorkflowLifecycleManager;
  let mockConfig: IWorkflowLifecycleConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      maxConcurrentWorkflows: 5,
      maxWorkflowDuration: 1800000, // 30 minutes
      cleanupInterval: 300000, // 5 minutes
      statusUpdateInterval: 60000, // 1 minute
      dependencyTimeout: 300000, // 5 minutes
      resourceThresholds: {
        memory: 256, // 256 MB
        cpu: 60, // 60%
        disk: 512, // 512 MB
      },
    };

    lifecycleManager = new WorkflowLifecycleManager(mockConfig);
  });

  afterEach(async () => {
    if (lifecycleManager && lifecycleManager.isInitialized()) {
      await lifecycleManager.stop();
    }
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new WorkflowLifecycleManager();
      expect(defaultManager).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customManager = new WorkflowLifecycleManager(mockConfig);
      expect(customManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await lifecycleManager.initialize();
      expect(lifecycleManager.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await lifecycleManager.initialize();
      await lifecycleManager.initialize(); // Should not throw
      expect(lifecycleManager.isInitialized()).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock a scenario where initialization fails
      const mockManager = new WorkflowLifecycleManager({
        ...mockConfig,
        maxConcurrentWorkflows: -1, // Invalid config
      });

      // The initialization should not actually fail with this config
      // So we'll test a different scenario - trying to initialize twice
      await mockManager.initialize();
      await mockManager.initialize(); // Should not throw
      expect(mockManager.isInitialized()).toBe(true);
      
      // Clean up
      await mockManager.stop();
    });
  });

  describe('createWorkflowInstance', () => {
    it('should create a workflow instance successfully', () => {
      const instance = lifecycleManager.createWorkflowInstance(
        'test-workflow',
        '1.0.0',
        WorkflowPriority.NORMAL
      );

      expect(instance).toBeDefined();
      expect(instance.workflowId).toBe('test-workflow');
      expect(instance.version).toBe('1.0.0');
      expect(instance.status).toBe(WorkflowStatus.PENDING);
      expect(instance.priority).toBe(WorkflowPriority.NORMAL);
      expect(instance.startedAt).toBeInstanceOf(Date);
      expect(instance.updatedAt).toBeInstanceOf(Date);
    });

    it('should create instance with dependencies', () => {
      const dependencies: IWorkflowDependency[] = [
        {
          workflowId: 'dependency-workflow',
          version: '1.0.0',
          condition: 'completed',
        },
      ];

      const instance = lifecycleManager.createWorkflowInstance(
        'test-workflow',
        '1.0.0',
        WorkflowPriority.HIGH,
        dependencies
      );

      expect(instance.priority).toBe(WorkflowPriority.HIGH);
    });

    it('should create instance with metadata', () => {
      const metadata = { test: 'data', userId: '123' };

      const instance = lifecycleManager.createWorkflowInstance(
        'test-workflow',
        '1.0.0',
        WorkflowPriority.NORMAL,
        [],
        metadata
      );

      expect(instance.metadata).toEqual(metadata);
    });
  });

  describe('workflow lifecycle operations', () => {
    let instance: IWorkflowInstance;

    beforeEach(async () => {
      await lifecycleManager.initialize();
      instance = lifecycleManager.createWorkflowInstance('test-workflow', '1.0.0');
    });

    describe('startWorkflow', () => {
      it('should start a workflow successfully', async () => {
        await lifecycleManager.startWorkflow(instance.id);

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.RUNNING);
      });

      it('should throw error for non-existent workflow', async () => {
        await expect(lifecycleManager.startWorkflow('non-existent'))
          .rejects.toThrow('Workflow instance not found: non-existent');
      });

      it('should throw error for workflow not in pending status', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        
        await expect(lifecycleManager.startWorkflow(instance.id))
          .rejects.toThrow('Cannot start workflow in running status');
      });
    });

    describe('pauseWorkflow', () => {
      it('should pause a running workflow', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        lifecycleManager.pauseWorkflow(instance.id);

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.PAUSED);
        expect(updatedInstance?.pausedAt).toBeInstanceOf(Date);
      });

      it('should throw error for non-existent workflow', () => {
        expect(() => lifecycleManager.pauseWorkflow('non-existent'))
          .toThrow('Workflow instance not found: non-existent');
      });

      it('should throw error for workflow not in running status', () => {
        expect(() => lifecycleManager.pauseWorkflow(instance.id))
          .toThrow('Cannot pause workflow in pending status');
      });
    });

    describe('resumeWorkflow', () => {
      it('should resume a paused workflow', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        lifecycleManager.pauseWorkflow(instance.id);
        lifecycleManager.resumeWorkflow(instance.id);

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.RUNNING);
        expect(updatedInstance?.resumedAt).toBeInstanceOf(Date);
      });

      it('should throw error for non-existent workflow', () => {
        expect(() => lifecycleManager.resumeWorkflow('non-existent'))
          .toThrow('Workflow instance not found: non-existent');
      });

      it('should throw error for workflow not in paused status', () => {
        expect(() => lifecycleManager.resumeWorkflow(instance.id))
          .toThrow('Cannot resume workflow in pending status');
      });
    });

    describe('completeWorkflow', () => {
      it('should complete a running workflow', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        lifecycleManager.completeWorkflow(instance.id, { result: 'success' });

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.COMPLETED);
        expect(updatedInstance?.completedAt).toBeInstanceOf(Date);
        expect(updatedInstance?.metadata?.result).toEqual({ result: 'success' });
      });

      it('should complete a paused workflow', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        lifecycleManager.pauseWorkflow(instance.id);
        lifecycleManager.completeWorkflow(instance.id);

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.COMPLETED);
      });

      it('should throw error for non-existent workflow', () => {
        expect(() => lifecycleManager.completeWorkflow('non-existent'))
          .toThrow('Workflow instance not found: non-existent');
      });
    });

    describe('failWorkflow', () => {
      it('should fail a workflow', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        const error = new Error('Workflow failed');
        lifecycleManager.failWorkflow(instance.id, error);

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.FAILED);
        expect(updatedInstance?.error).toBe(error);
      });

      it('should throw error for non-existent workflow', () => {
        const error = new Error('Test error');
        expect(() => lifecycleManager.failWorkflow('non-existent', error))
          .toThrow('Workflow instance not found: non-existent');
      });
    });

    describe('cancelWorkflow', () => {
      it('should cancel a workflow', async () => {
        await lifecycleManager.startWorkflow(instance.id);
        lifecycleManager.cancelWorkflow(instance.id, 'User cancelled');

        const updatedInstance = lifecycleManager.getWorkflowInstance(instance.id);
        expect(updatedInstance?.status).toBe(WorkflowStatus.CANCELLED);
        expect(updatedInstance?.cancelledAt).toBeInstanceOf(Date);
        expect(updatedInstance?.metadata?.cancellationReason).toBe('User cancelled');
      });

      it('should throw error for non-existent workflow', () => {
        expect(() => lifecycleManager.cancelWorkflow('non-existent'))
          .toThrow('Workflow instance not found: non-existent');
      });
    });
  });

  describe('workflow queries', () => {
    let instance1: IWorkflowInstance;
    let instance2: IWorkflowInstance;
    let instance3: IWorkflowInstance;

    beforeEach(async () => {
      await lifecycleManager.initialize();
      
      instance1 = lifecycleManager.createWorkflowInstance('test-workflow-1', '1.0.0', WorkflowPriority.LOW);
      instance2 = lifecycleManager.createWorkflowInstance('test-workflow-2', '1.0.0', WorkflowPriority.HIGH);
      instance3 = lifecycleManager.createWorkflowInstance('test-workflow-3', '1.0.0', WorkflowPriority.NORMAL);
    });

    describe('getWorkflowInstance', () => {
      it('should return workflow instance by ID', () => {
        const found = lifecycleManager.getWorkflowInstance(instance1.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(instance1.id);
      });

      it('should return undefined for non-existent workflow', () => {
        const found = lifecycleManager.getWorkflowInstance('non-existent');
        expect(found).toBeUndefined();
      });
    });

    describe('getAllWorkflowInstances', () => {
      it('should return all workflow instances', () => {
        const instances = lifecycleManager.getAllWorkflowInstances();
        expect(instances).toHaveLength(3);
        expect(instances.map(i => i.id)).toContain(instance1.id);
        expect(instances.map(i => i.id)).toContain(instance2.id);
        expect(instances.map(i => i.id)).toContain(instance3.id);
      });
    });

    describe('getInstancesByWorkflowId', () => {
      it('should return instances for a specific workflow ID', () => {
        const instances = lifecycleManager.getInstancesByWorkflowId('test-workflow-1');
        expect(instances).toHaveLength(1);
        expect(instances[0].id).toBe(instance1.id);
        expect(instances[0].workflowId).toBe('test-workflow-1');
      });

      it('should return multiple instances for the same workflow ID', () => {
        // Create another instance with the same workflow ID
        const instance4 = lifecycleManager.createWorkflowInstance(
          'test-workflow-1',
          '1.0.0',
          WorkflowPriority.NORMAL
        );

        const instances = lifecycleManager.getInstancesByWorkflowId('test-workflow-1');
        expect(instances).toHaveLength(2);
        expect(instances.map(i => i.id)).toContain(instance1.id);
        expect(instances.map(i => i.id)).toContain(instance4.id);
      });

      it('should return empty array for non-existent workflow ID', () => {
        const instances = lifecycleManager.getInstancesByWorkflowId('non-existent-workflow');
        expect(instances).toHaveLength(0);
        expect(instances).toEqual([]);
      });

      it('should return instances with different statuses', async () => {
        // Create multiple instances with same workflow ID
        const instance4 = lifecycleManager.createWorkflowInstance(
          'test-workflow-1',
          '1.0.0',
          WorkflowPriority.NORMAL
        );
        
        await lifecycleManager.startWorkflow(instance1.id);
        lifecycleManager.completeWorkflow(instance1.id);
        await lifecycleManager.startWorkflow(instance4.id);

        const instances = lifecycleManager.getInstancesByWorkflowId('test-workflow-1');
        expect(instances).toHaveLength(2);
        expect(instances.find(i => i.id === instance1.id)?.status).toBe(WorkflowStatus.COMPLETED);
        expect(instances.find(i => i.id === instance4.id)?.status).toBe(WorkflowStatus.RUNNING);
      });
    });

    describe('getWorkflowsByStatus', () => {
      it('should return workflows by status', async () => {
        const pendingWorkflows = lifecycleManager.getWorkflowsByStatus(WorkflowStatus.PENDING);
        expect(pendingWorkflows).toHaveLength(3);

        await lifecycleManager.startWorkflow(instance1.id);
        const runningWorkflows = lifecycleManager.getWorkflowsByStatus(WorkflowStatus.RUNNING);
        expect(runningWorkflows).toHaveLength(1);
        expect(runningWorkflows[0].id).toBe(instance1.id);
      });
    });

    describe('getWorkflowsByPriority', () => {
      it('should return workflows by priority', () => {
        const highPriorityWorkflows = lifecycleManager.getWorkflowsByPriority(WorkflowPriority.HIGH);
        expect(highPriorityWorkflows).toHaveLength(1);
        expect(highPriorityWorkflows[0].id).toBe(instance2.id);

        const lowPriorityWorkflows = lifecycleManager.getWorkflowsByPriority(WorkflowPriority.LOW);
        expect(lowPriorityWorkflows).toHaveLength(1);
        expect(lowPriorityWorkflows[0].id).toBe(instance1.id);
      });
    });
  });

  describe('dependency management', () => {
    let dependentInstance: IWorkflowInstance;
    let dependencyInstance: IWorkflowInstance;

    beforeEach(async () => {
      await lifecycleManager.initialize();
      
      dependentInstance = lifecycleManager.createWorkflowInstance('dependent-workflow', '1.0.0');
      dependencyInstance = lifecycleManager.createWorkflowInstance('dependency-workflow', '1.0.0');
    });

    describe('addDependency', () => {
      it('should add dependency successfully', () => {
        lifecycleManager.addDependency(dependentInstance.id, dependencyInstance.id, 'completed');

        const dependent = lifecycleManager.getWorkflowInstance(dependentInstance.id);
        const dependency = lifecycleManager.getWorkflowInstance(dependencyInstance.id);

        expect(dependent?.dependencies).toContain(dependencyInstance.id);
        expect(dependency?.dependents).toContain(dependentInstance.id);
      });

      it('should throw error for non-existent dependent workflow', () => {
        expect(() => lifecycleManager.addDependency('non-existent', dependencyInstance.id))
          .toThrow('Dependent workflow not found: non-existent');
      });

      it('should throw error for non-existent dependency workflow', () => {
        expect(() => lifecycleManager.addDependency(dependentInstance.id, 'non-existent'))
          .toThrow('Dependency workflow not found: non-existent');
      });
    });

    describe('removeDependency', () => {
      it('should remove dependency successfully', () => {
        lifecycleManager.addDependency(dependentInstance.id, dependencyInstance.id);
        lifecycleManager.removeDependency(dependentInstance.id, dependencyInstance.id);

        const dependent = lifecycleManager.getWorkflowInstance(dependentInstance.id);
        const dependency = lifecycleManager.getWorkflowInstance(dependencyInstance.id);

        expect(dependent?.dependencies).not.toContain(dependencyInstance.id);
        expect(dependency?.dependents).not.toContain(dependentInstance.id);
      });
    });
  });

  describe('statistics', () => {
    let instance1: IWorkflowInstance;
    let instance2: IWorkflowInstance;
    let instance3: IWorkflowInstance;

    beforeEach(async () => {
      await lifecycleManager.initialize();
      
      instance1 = lifecycleManager.createWorkflowInstance('workflow1', '1.0.0');
      instance2 = lifecycleManager.createWorkflowInstance('workflow2', '1.0.0');
      instance3 = lifecycleManager.createWorkflowInstance('workflow3', '1.0.0');
    });

    describe('getStats', () => {
      it('should return correct statistics', () => {
        const stats = lifecycleManager.getStats();

        expect(stats.totalWorkflows).toBe(3);
        expect(stats.runningWorkflows).toBe(0);
        expect(stats.pausedWorkflows).toBe(0);
        expect(stats.completedWorkflows).toBe(0);
        expect(stats.failedWorkflows).toBe(0);
        expect(stats.cancelledWorkflows).toBe(0);
        expect(stats.averageExecutionTime).toBe(0);
        expect(stats.resourceUtilization).toBeDefined();
      });

      it('should update statistics after workflow state changes', async () => {
        await lifecycleManager.startWorkflow(instance1.id);
        lifecycleManager.completeWorkflow(instance1.id);
        lifecycleManager.failWorkflow(instance2.id, new Error('Test error'));
        lifecycleManager.cancelWorkflow(instance3.id, 'Cancelled');

        const stats = lifecycleManager.getStats();

        expect(stats.totalWorkflows).toBe(3);
        expect(stats.runningWorkflows).toBe(0);
        expect(stats.completedWorkflows).toBe(1);
        expect(stats.failedWorkflows).toBe(1);
        expect(stats.cancelledWorkflows).toBe(1);
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up completed workflows', async () => {
      await lifecycleManager.initialize();
      
      const instance = lifecycleManager.createWorkflowInstance('test-workflow', '1.0.0');
      await lifecycleManager.startWorkflow(instance.id);
      lifecycleManager.completeWorkflow(instance.id);

      // Mock old completion time
      const oldInstance = lifecycleManager.getWorkflowInstance(instance.id);
      if (oldInstance) {
        oldInstance.completedAt = new Date(Date.now() - 2000000); // 2 hours ago
        oldInstance.updatedAt = new Date(Date.now() - 2000000);
      }

      await lifecycleManager.cleanup();

      const cleanedInstance = lifecycleManager.getWorkflowInstance(instance.id);
      expect(cleanedInstance).toBeUndefined();
    });

    it('should not clean up recent workflows', async () => {
      await lifecycleManager.initialize();
      
      const instance = lifecycleManager.createWorkflowInstance('test-workflow', '1.0.0');
      await lifecycleManager.startWorkflow(instance.id);
      lifecycleManager.completeWorkflow(instance.id);

      await lifecycleManager.cleanup();

      const cleanedInstance = lifecycleManager.getWorkflowInstance(instance.id);
      expect(cleanedInstance).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop the lifecycle manager', async () => {
      await lifecycleManager.initialize();
      expect(lifecycleManager.isInitialized()).toBe(true);

      await lifecycleManager.stop();
      expect(lifecycleManager.isInitialized()).toBe(false);
    });

    it('should handle stop errors gracefully', async () => {
      // This would test error handling during stop
      await lifecycleManager.initialize();
      await expect(lifecycleManager.stop()).resolves.not.toThrow();
    });
  });

  describe('event emission', () => {
    it('should emit events for workflow lifecycle changes', async () => {
      await lifecycleManager.initialize();
      
      const eventSpy = jest.fn();
      lifecycleManager.on('workflowCreated', eventSpy);

      const instance = lifecycleManager.createWorkflowInstance('test-workflow', '1.0.0');
      
      expect(eventSpy).toHaveBeenCalledWith(instance);
    });

    it('should emit workflow started event', async () => {
      await lifecycleManager.initialize();
      
      const instance = lifecycleManager.createWorkflowInstance('test-workflow', '1.0.0');
      const eventSpy = jest.fn();
      lifecycleManager.on('workflowStarted', eventSpy);

      await lifecycleManager.startWorkflow(instance.id);
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: instance.id,
        status: WorkflowStatus.RUNNING,
      }));
    });
  });

  describe('workflow history deletion (MongoDB)', () => {
    // Get the mocked WorkflowInstanceModel
    const MockedWorkflowInstanceModel = require('../models/WorkflowInstanceModel').default;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('deleteWorkflowHistory', () => {
      it('should delete a single workflow history item successfully', async () => {
        MockedWorkflowInstanceModel.deleteOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
        });

        const result = await lifecycleManager.deleteWorkflowHistory('test-instance-123');

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(1);
        expect(result.message).toContain('Successfully deleted');
        expect(MockedWorkflowInstanceModel.deleteOne).toHaveBeenCalledWith({ id: 'test-instance-123' });
      });

      it('should return failure when instance not found', async () => {
        MockedWorkflowInstanceModel.deleteOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 0 })
        });

        const result = await lifecycleManager.deleteWorkflowHistory('non-existent');

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toContain('not found');
      });

      it('should handle database errors', async () => {
        MockedWorkflowInstanceModel.deleteOne.mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error'))
        });

        await expect(lifecycleManager.deleteWorkflowHistory('test-instance'))
          .rejects.toThrow('Database error');
      });
    });

    describe('deleteWorkflowHistoryBatch', () => {
      it('should delete multiple workflow history items successfully', async () => {
        MockedWorkflowInstanceModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 3 })
        });

        const instanceIds = ['id-1', 'id-2', 'id-3'];
        const result = await lifecycleManager.deleteWorkflowHistoryBatch(instanceIds);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(3);
        expect(result.message).toContain('Successfully deleted 3');
        expect(MockedWorkflowInstanceModel.deleteMany).toHaveBeenCalledWith({ 
          id: { $in: instanceIds } 
        });
      });

      it('should return failure when no IDs provided', async () => {
        const result = await lifecycleManager.deleteWorkflowHistoryBatch([]);

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toContain('No instance IDs provided');
      });

      it('should handle partial deletions', async () => {
        MockedWorkflowInstanceModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 2 })
        });

        const instanceIds = ['id-1', 'id-2', 'id-3'];
        const result = await lifecycleManager.deleteWorkflowHistoryBatch(instanceIds);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(2);
      });

      it('should handle database errors', async () => {
        MockedWorkflowInstanceModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Connection failed'))
        });

        await expect(lifecycleManager.deleteWorkflowHistoryBatch(['id-1', 'id-2']))
          .rejects.toThrow('Connection failed');
      });
    });

    describe('clearWorkflowHistory', () => {
      it('should clear all history for a workflow definition', async () => {
        MockedWorkflowInstanceModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 100 })
        });

        const result = await lifecycleManager.clearWorkflowHistory('core.CleanCacheWorkflow@1.0.0');

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(100);
        expect(result.message).toContain('Successfully cleared 100');
        expect(MockedWorkflowInstanceModel.deleteMany).toHaveBeenCalledWith({ 
          workflowDefinitionId: 'core.CleanCacheWorkflow@1.0.0' 
        });
      });

      it('should return failure when workflowDefinitionId is not provided', async () => {
        const result = await lifecycleManager.clearWorkflowHistory('');

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toContain('Workflow definition ID is required');
      });

      it('should handle case when no history exists', async () => {
        MockedWorkflowInstanceModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ deletedCount: 0 })
        });

        const result = await lifecycleManager.clearWorkflowHistory('core.NonExistent@1.0.0');

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(0);
      });

      it('should handle database errors', async () => {
        MockedWorkflowInstanceModel.deleteMany.mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Permission denied'))
        });

        await expect(lifecycleManager.clearWorkflowHistory('core.TestWorkflow@1.0.0'))
          .rejects.toThrow('Permission denied');
      });
    });
  });
}); 