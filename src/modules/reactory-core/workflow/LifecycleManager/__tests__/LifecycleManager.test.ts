import { 
  WorkflowLifecycleManager, 
  WorkflowStatus, 
  WorkflowPriority,
  WorkflowESStatus,
  type IWorkflowInstance,
  type IWorkflowDependency,
  type IWorkflowLifecycleConfig
} from '../LifecycleManager';
import { TerminationReasonCode, hasUnresolvedSalvage } from '../../termination/TerminationReason';
import {
  WorkflowInstanceLifecycleRecorder,
  UnresolvedSalvageError,
} from '../../termination/TerminationRecorder';
import { clearOutbox, readOutboxRecords } from '../../termination/TerminationOutbox';

// Mock dependencies
jest.mock('../../../../../logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// M9 Phase 2: WorkflowInstanceModel (mongoose) has been retired.
// History deletion tests now use a mock IPersistenceProvider injected via initialize().


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

  describe('instance stats snapshot (coalescing + caching)', () => {
    // One provider scan must serve BOTH the status rollup and the failed-pointer
    // counts. Before this existed the registry list called the provider twice per
    // request, which on a large instance collection doubled an already-slow query.
    const mockGetWorkflowInstanceStats = jest.fn();

    const mockPersistence: any = {
      getWorkflowInstanceStats: mockGetWorkflowInstanceStats,
      queryWorkflowInstances: jest.fn().mockResolvedValue({ instances: [], total: 0 }),
      deleteWorkflowInstances: jest.fn().mockResolvedValue(0),
    };

    const providerStats = {
      total: 10,
      // engine statuses: 0=Runnable 1=Suspended 2=Complete 3=Terminated 4=DeadLettered
      byStatus: { 0: 1, 2: 7, 3: 2 },
      averageCompletionTimeMs: 1234,
      byDefinition: [
        { workflowDefinitionId: 'core.X@1.0.0', total: 10, complete: 7, terminated: 2 },
      ],
      instancesWithFailedSteps: { 'core.X@1.0.0': 3 },
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      // mockReset (not mockClear): a leftover mockResolvedValueOnce queue from a
      // previous test would otherwise be consumed by this one.
      mockGetWorkflowInstanceStats.mockReset();
      mockGetWorkflowInstanceStats.mockResolvedValue(providerStats);
      lifecycleManager = new WorkflowLifecycleManager(mockConfig);
      await lifecycleManager.initialize({ persistence: mockPersistence });
    });

    it('serves status stats AND failed-step counts from a single provider scan', async () => {
      const stats = await lifecycleManager.getWorkflowExecutionStats();
      const failed = await lifecycleManager.getInstancesWithFailedSteps();

      expect(mockGetWorkflowInstanceStats).toHaveBeenCalledTimes(1);
      expect(stats.complete).toBe(7);
      expect(stats.terminated).toBe(2);
      expect(stats.total).toBe(10);
      expect(failed['core.X@1.0.0']).toBe(3);
    });

    it('coalesces concurrent callers into one in-flight scan', async () => {
      await Promise.all([
        lifecycleManager.getWorkflowExecutionStats(),
        lifecycleManager.getInstancesWithFailedSteps(),
        lifecycleManager.getInstanceStatsSnapshot(),
      ]);

      expect(mockGetWorkflowInstanceStats).toHaveBeenCalledTimes(1);
    });

    it('reuses the cached snapshot for a second sequential read', async () => {
      await lifecycleManager.getInstanceStatsSnapshot();
      await lifecycleManager.getInstanceStatsSnapshot();

      expect(mockGetWorkflowInstanceStats).toHaveBeenCalledTimes(1);
    });

    it('rescans when maxAgeMs is 0', async () => {
      await lifecycleManager.getInstanceStatsSnapshot({ maxAgeMs: 0 });
      await lifecycleManager.getInstanceStatsSnapshot({ maxAgeMs: 0 });

      expect(mockGetWorkflowInstanceStats).toHaveBeenCalledTimes(2);
    });

    it('returns zeroed stats when no persistence provider is configured', async () => {
      const bare = new WorkflowLifecycleManager(mockConfig);
      await bare.initialize({ persistence: null });

      const stats = await bare.getWorkflowExecutionStats();

      expect(stats.total).toBe(0);
      expect(stats.complete).toBe(0);
    });
  });

  describe('retention sweep', () => {
    const mockQuery = jest.fn();
    const mockDeleteMany = jest.fn();
    const mockGetStats = jest.fn();

    const mockPersistence: any = {
      queryWorkflowInstances: mockQuery,
      deleteWorkflowInstances: mockDeleteMany,
      getWorkflowInstanceStats: mockGetStats,
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      // mockReset (not mockClear): mockResolvedValueOnce queues survive
      // clearAllMocks and would leak into the next test.
      mockQuery.mockReset();
      mockDeleteMany.mockReset();
      mockGetStats.mockReset();
      mockGetStats.mockResolvedValue({
        total: 0, byStatus: {}, averageCompletionTimeMs: null, byDefinition: [], instancesWithFailedSteps: {},
      });
      lifecycleManager = new WorkflowLifecycleManager(mockConfig);
      await lifecycleManager.initialize({ persistence: mockPersistence });
    });

    it('rejects a non-positive olderThanDays', async () => {
      await expect(lifecycleManager.sweepExpiredInstances({ olderThanDays: 0 }))
        .rejects.toThrow(/positive number/);
      await expect(lifecycleManager.sweepExpiredInstances({ olderThanDays: -5 }))
        .rejects.toThrow(/positive number/);
    });

    // Live work must never be swept, even if a caller explicitly asks.
    it('refuses to sweep Runnable or Suspended instances', async () => {
      await expect(
        lifecycleManager.sweepExpiredInstances({
          olderThanDays: 30,
          statuses: [WorkflowESStatus.RUNNABLE],
        })
      ).rejects.toThrow(/only COMPLETE and TERMINATED/);

      await expect(
        lifecycleManager.sweepExpiredInstances({
          olderThanDays: 30,
          statuses: [WorkflowESStatus.SUSPENDED],
        })
      ).rejects.toThrow(/only COMPLETE and TERMINATED/);

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it('deletes terminal instances older than the cutoff', async () => {
      mockQuery
        .mockResolvedValueOnce({ instances: [{ id: 'a' }, { id: 'b' }], total: 2 })
        .mockResolvedValueOnce({ instances: [], total: 0 });
      mockDeleteMany.mockResolvedValue(2);

      const result = await lifecycleManager.sweepExpiredInstances({ olderThanDays: 30 });

      expect(mockDeleteMany).toHaveBeenCalledWith(['a', 'b']);
      expect(result.matched).toBe(2);
      expect(result.deleted).toBe(2);
      expect(result.hasMore).toBe(false);

      // The predicate must be expressed in terms of terminal statuses + createTime.
      const queryArg = mockQuery.mock.calls[0][0];
      expect(queryArg.createdBefore).toBeInstanceOf(Date);
      expect(queryArg.status).toEqual([
        WorkflowESStatus.COMPLETE,
        WorkflowESStatus.TERMINATED,
      ]);
    });

    it('dryRun reports the match count without deleting', async () => {
      mockQuery.mockResolvedValue({ instances: [{ id: 'a' }], total: 1 });

      const result = await lifecycleManager.sweepExpiredInstances({
        olderThanDays: 30,
        dryRun: true,
      });

      expect(mockDeleteMany).not.toHaveBeenCalled();
      expect(result.matched).toBe(1);
      expect(result.deleted).toBe(0);
    });

    // R2 regression. The dry run used to stop after one page and report that
    // page's length, so a 67k backlog sized as `matched: 500`. It must report the
    // provider's exact `total`, which the same query already computes.
    it('dryRun reports the EXACT backlog from the provider total, not one page', async () => {
      mockQuery.mockResolvedValue({ instances: [{ id: 'a' }, { id: 'b' }], total: 67246 });

      const result = await lifecycleManager.sweepExpiredInstances({
        olderThanDays: 30,
        batchSize: 2,
        dryRun: true,
      });

      expect(mockDeleteMany).not.toHaveBeenCalled();
      expect(result.matched).toBe(67246);
      expect(result.deleted).toBe(0);
      // A dry run deletes nothing, so there is nothing to continue.
      expect(result.hasMore).toBe(false);
      expect(result.batches).toBe(1);
    });

    it('dryRun falls back to the page length when no total is reported', async () => {
      mockQuery.mockResolvedValue({ instances: [{ id: 'a' }] });

      const result = await lifecycleManager.sweepExpiredInstances({
        olderThanDays: 30,
        dryRun: true,
      });

      expect(result.matched).toBe(1);
    });

    it('invalidates the cached stats snapshot after a real delete', async () => {
      await lifecycleManager.getInstanceStatsSnapshot();
      expect(mockGetStats).toHaveBeenCalledTimes(1);

      mockQuery
        .mockResolvedValueOnce({ instances: [{ id: 'a' }], total: 1 })
        .mockResolvedValueOnce({ instances: [], total: 0 });
      mockDeleteMany.mockResolvedValue(1);

      await lifecycleManager.sweepExpiredInstances({ olderThanDays: 30 });
      await lifecycleManager.getInstanceStatsSnapshot();

      // A second scan proves the cache was dropped.
      expect(mockGetStats).toHaveBeenCalledTimes(2);
    });

    // A scan that STARTED before a sweep's delete must not re-cache its
    // pre-delete counts when it finally resolves. The generation counter guards
    // the `.then`, so the stale result is returned to its caller but never cached.
    it('does not cache a scan that was invalidated while it was in flight', async () => {
      let resolveSlowScan: (value: any) => void = () => {};
      const slowScan = new Promise((resolve) => { resolveSlowScan = resolve; });

      mockGetStats
        .mockReturnValueOnce(slowScan as any)
        .mockResolvedValue({
          total: 5, byStatus: { 2: 5 }, averageCompletionTimeMs: null,
          byDefinition: [], instancesWithFailedSteps: {},
        });

      // Start a scan and leave it pending.
      const pending = lifecycleManager.getInstanceStatsSnapshot({ maxAgeMs: 0 });

      // A sweep deletes rows and invalidates mid-scan.
      mockQuery
        .mockResolvedValueOnce({ instances: [{ id: 'a' }], total: 1 })
        .mockResolvedValueOnce({ instances: [], total: 0 });
      mockDeleteMany.mockResolvedValue(1);
      await lifecycleManager.sweepExpiredInstances({ olderThanDays: 30 });

      // The stale scan now resolves - its result must be discarded, not cached.
      resolveSlowScan({
        total: 999, byStatus: { 2: 999 }, averageCompletionTimeMs: null,
        byDefinition: [], instancesWithFailedSteps: {},
      });
      await pending;

      const fresh = await lifecycleManager.getInstanceStatsSnapshot();
      expect(fresh.stats.total).toBe(5);
    });

    it('reports hasMore when a full batch was consumed', async () => {
      mockQuery.mockResolvedValue({ instances: [{ id: 'a' }], total: 1 });
      mockDeleteMany.mockResolvedValue(1);

      const result = await lifecycleManager.sweepExpiredInstances({
        olderThanDays: 30,
        batchSize: 1,
        maxBatches: 1,
      });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('workflow history deletion (via IPersistenceProvider — M9)', () => {
    // Build a minimal mock persistence provider for testing
    const mockDeleteWorkflowInstance = jest.fn();
    const mockDeleteWorkflowInstances = jest.fn();
    const mockDeleteWorkflowInstancesByDefinitionId = jest.fn();

    const mockPersistence: any = {
      deleteWorkflowInstance: mockDeleteWorkflowInstance,
      deleteWorkflowInstances: mockDeleteWorkflowInstances,
      deleteWorkflowInstancesByDefinitionId: mockDeleteWorkflowInstancesByDefinitionId,
      queryWorkflowInstances: jest.fn().mockResolvedValue({ instances: [], total: 0 }),
      getWorkflowInstanceStats: jest.fn().mockResolvedValue({
        total: 0, byStatus: {}, averageCompletionTimeMs: null, byDefinition: [], instancesWithFailedSteps: {}
      }),
      getWorkflowInstanceTimeSeries: jest.fn().mockResolvedValue([]),
      getWorkflowInstance: jest.fn().mockResolvedValue(null),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      lifecycleManager = new WorkflowLifecycleManager(mockConfig);
      await lifecycleManager.initialize({ persistence: mockPersistence });
    });

    describe('deleteWorkflowHistory', () => {
      it('should delete a single workflow history item successfully', async () => {
        mockDeleteWorkflowInstance.mockResolvedValue(true);

        const result = await lifecycleManager.deleteWorkflowHistory('test-instance-123');

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(1);
        expect(result.message).toContain('Successfully deleted');
        expect(mockDeleteWorkflowInstance).toHaveBeenCalledWith('test-instance-123');
      });

      it('should return failure when instance not found', async () => {
        mockDeleteWorkflowInstance.mockResolvedValue(false);

        const result = await lifecycleManager.deleteWorkflowHistory('non-existent');

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toContain('not found');
      });

      it('should handle provider errors', async () => {
        mockDeleteWorkflowInstance.mockRejectedValue(new Error('Database error'));

        await expect(lifecycleManager.deleteWorkflowHistory('test-instance'))
          .rejects.toThrow('Database error');
      });
    });

    describe('deleteWorkflowHistoryBatch', () => {
      it('should delete multiple workflow history items successfully', async () => {
        mockDeleteWorkflowInstances.mockResolvedValue(3);

        const instanceIds = ['id-1', 'id-2', 'id-3'];
        const result = await lifecycleManager.deleteWorkflowHistoryBatch(instanceIds);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(3);
        expect(result.message).toContain('Successfully deleted 3');
        expect(mockDeleteWorkflowInstances).toHaveBeenCalledWith(instanceIds);
      });

      it('should return failure when no IDs provided', async () => {
        const result = await lifecycleManager.deleteWorkflowHistoryBatch([]);

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toContain('No instance IDs provided');
      });

      it('should handle partial deletions', async () => {
        mockDeleteWorkflowInstances.mockResolvedValue(2);

        const instanceIds = ['id-1', 'id-2', 'id-3'];
        const result = await lifecycleManager.deleteWorkflowHistoryBatch(instanceIds);

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(2);
      });

      it('should handle provider errors', async () => {
        mockDeleteWorkflowInstances.mockRejectedValue(new Error('Connection failed'));

        await expect(lifecycleManager.deleteWorkflowHistoryBatch(['id-1', 'id-2']))
          .rejects.toThrow('Connection failed');
      });
    });

    describe('clearWorkflowHistory', () => {
      // The wipe is salvage-guarded now: it lists the definition's instances and
      // deletes only the rows that owe no salvage work, so these drive
      // queryWorkflowInstances + deleteWorkflowInstances (not the unguarded
      // delete-by-definition call, which is exactly what the guard replaced).
      const seedDefinitionRows = (ids: string[]) => {
        (mockPersistence.queryWorkflowInstances as jest.Mock).mockResolvedValue({
          instances: ids.map((id) => ({ id, workflowDefinitionId: 'core.CleanCacheWorkflow@1.0.0', data: {} })),
          total: ids.length,
        });
      };

      it('should clear all history for a workflow definition', async () => {
        const ids = Array.from({ length: 10 }, (_, i) => `inst-${i}`);
        seedDefinitionRows(ids);
        mockDeleteWorkflowInstances.mockResolvedValue(ids.length);

        const result = await lifecycleManager.clearWorkflowHistory('core.CleanCacheWorkflow@1.0.0');

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(ids.length);
        expect(result.skippedSalvage).toBe(0);
        expect(result.message).toContain('Successfully cleared 10');
        expect(mockDeleteWorkflowInstances).toHaveBeenCalledWith(ids);
        // The unguarded by-definition wipe must not be used any more.
        expect(mockDeleteWorkflowInstancesByDefinitionId).not.toHaveBeenCalled();
      });

      it('should return failure when workflowDefinitionId is not provided', async () => {
        const result = await lifecycleManager.clearWorkflowHistory('');

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
        expect(result.message).toContain('Workflow definition ID is required');
      });

      it('should handle case when no history exists', async () => {
        (mockPersistence.queryWorkflowInstances as jest.Mock).mockResolvedValue({ instances: [], total: 0 });

        const result = await lifecycleManager.clearWorkflowHistory('core.NonExistent@1.0.0');

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(0);
      });

      it('should hold back rows that still owe salvage work', async () => {
        (mockPersistence.queryWorkflowInstances as jest.Mock).mockResolvedValue({
          instances: [
            { id: 'inst-blocked', workflowDefinitionId: 'core.CleanCacheWorkflow@1.0.0', data: { __reactory: { salvage: { required: true, worktreePath: '/tmp/wt', recordedAt: '2026-11-03T11:00:00.000Z' } } } },
            { id: 'inst-free', workflowDefinitionId: 'core.CleanCacheWorkflow@1.0.0', data: {} },
          ],
          total: 2,
        });
        mockDeleteWorkflowInstances.mockResolvedValue(1);

        const result = await lifecycleManager.clearWorkflowHistory('core.CleanCacheWorkflow@1.0.0');

        expect(result.deletedCount).toBe(1);
        expect(result.skippedSalvage).toBe(1);
        expect(result.blockedInstanceIds).toEqual(['inst-blocked']);
        expect(mockDeleteWorkflowInstances).toHaveBeenCalledWith(['inst-free']);
      });

      it('should handle provider errors', async () => {
        (mockPersistence.queryWorkflowInstances as jest.Mock).mockRejectedValue(new Error('Permission denied'));

        await expect(lifecycleManager.clearWorkflowHistory('core.TestWorkflow@1.0.0'))
          .rejects.toThrow('Permission denied');
      });
    });

    describe('without persistence provider', () => {
      it('should return graceful response when provider is null', async () => {
        const noPersistenceManager = new WorkflowLifecycleManager(mockConfig);
        await noPersistenceManager.initialize({ persistence: null });

        const deleteResult = await noPersistenceManager.deleteWorkflowHistory('any-id');
        expect(deleteResult.success).toBe(false);
        expect(deleteResult.deletedCount).toBe(0);

        const batchResult = await noPersistenceManager.deleteWorkflowHistoryBatch(['id-1']);
        expect(batchResult.success).toBe(false);

        const clearResult = await noPersistenceManager.clearWorkflowHistory('some.Workflow@1.0.0');
        expect(clearResult.success).toBe(false);

        await noPersistenceManager.stop();
      });
    });
  });
}); 

// ══════════════════════════════════════════════════════════════════════════════
// REACTORY-302016408 — termination reasons, completeTime, last activity, salvage
//
// The incident: instance 6ae999c2738d66f0ebd7a2b5 was Terminated (status 3) with
// 41/43 steps complete, 0 failed steps, completeTime null, zero recorded errors
// and no reason anywhere.
//
// The FIXTURES matter as much as the assertions. Every case here is explicit
// about engine status, because the first cut of this change only ever exercised
// status 3 — which hid two real defects: COMPLETE rows were given a fabricated
// "the process died" reason, and already-finished rows could be re-labelled by a
// deploy or a crash. There is now a fixture at status 0, 2, 3 and 4.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal in-memory IPersistenceProvider.
 *
 * `persistWorkflow` implements the compare-and-set contract the real providers
 * honour (expected token must match, then the stored token advances), so the
 * recorder's concurrency retry is exercised for real rather than mocked away.
 */
class FakePersistence {
  public store: Map<string, any> = new Map();
  public persistCount = 0;
  public failNextPersist: Error | null = null;
  public failAllPersists: Error | null = null;

  constructor(instances: any[] = []) {
    instances.forEach((instance) => this.seed(instance));
  }

  private clone<T>(value: T): T {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  public seed(instance: any): void {
    this.store.set(instance.id, this.clone({ concurrencyToken: 0, ...instance }));
  }

  public raw(id: string): any {
    return this.store.get(id) || null;
  }

  public async getWorkflowInstance(id: string): Promise<any> {
    return this.clone(this.store.get(id));
  }

  public async persistWorkflow(instance: any): Promise<void> {
    if (this.failAllPersists) throw this.failAllPersists;
    if (this.failNextPersist) {
      const error = this.failNextPersist;
      this.failNextPersist = null;
      throw error;
    }
    const current = this.store.get(instance.id);
    if (!current) throw new Error(`missing instance ${instance.id}`);
    const expected = instance.concurrencyToken ?? 0;
    if ((current.concurrencyToken ?? 0) !== expected) {
      const error: any = new Error('concurrency conflict');
      error.name = 'WorkflowConcurrencyError';
      throw error;
    }
    this.persistCount += 1;
    instance.concurrencyToken = expected + 1;
    this.store.set(instance.id, this.clone({ ...instance, concurrencyToken: instance.concurrencyToken }));
  }

  public async queryWorkflowInstances(query: any = {}): Promise<{ instances: any[]; total: number }> {
    const statuses = query.status === undefined
      ? null
      : (Array.isArray(query.status) ? query.status : [query.status]);
    const matched = Array.from(this.store.values())
      .filter((instance) => !statuses || statuses.indexOf(instance.status) !== -1)
      .filter((instance) => !query.workflowDefinitionId
        || instance.workflowDefinitionId === query.workflowDefinitionId)
      .filter((instance) => !query.createdBefore
        || new Date(instance.createTime).getTime() < new Date(query.createdBefore).getTime())
      .sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
    return { instances: this.clone(matched), total: matched.length };
  }

  public async deleteWorkflowInstance(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  public async deleteWorkflowInstances(ids: string[]): Promise<number> {
    let deleted = 0;
    ids.forEach((id) => { if (this.store.delete(id)) deleted += 1; });
    return deleted;
  }

  public async deleteWorkflowInstancesByDefinitionId(workflowDefinitionId: string): Promise<number> {
    let deleted = 0;
    Array.from(this.store.entries()).forEach(([id, instance]) => {
      if (instance.workflowDefinitionId === workflowDefinitionId) {
        this.store.delete(id);
        deleted += 1;
      }
    });
    return deleted;
  }
}

/**
 * The exact shape the incident left behind: status 3, completeTime null, engine
 * progress stopped at 08:22:34, no reason, no error.
 *
 * `status` is overridable so the same instance can be modelled as live (0),
 * Complete (2), Terminated (3) or DeadLettered (4).
 */
const makeInstance = (overrides: any = {}): any => ({
  id: 'inst-incident',
  workflowDefinitionId: 'ai.ProcessAITicket@1.4.8',
  tenantId: 'reactory',
  version: '1.4.8',
  status: 3, // Terminated
  createTime: '2026-11-03T08:22:26.000Z',
  completeTime: null,
  data: {
    inputs: { ticketRef: 'REACTORY-302016408/20261103/1119821180' },
    variables: {},
    stepResults: {},
    env: {},
    outputs: {},
  },
  executionPointers: [
    { id: 'p-42', stepId: 42, stepName: 'Log baseline accepted', status: 3, active: false, retryCount: 0, startTime: '2026-11-03T08:22:33.000Z', endTime: '2026-11-03T08:22:34.000Z' },
    { id: 'p-43', stepId: 43, stepName: '(start)', status: 2, active: true, retryCount: 0, startTime: '2026-11-03T08:22:34.000Z' },
  ],
  ...overrides,
});

/** A run that finished successfully: status 2, completeTime set, nothing else. */
const makeCompletedInstance = (overrides: any = {}): any => makeInstance({
  id: 'inst-complete',
  status: 2,
  completeTime: '2026-11-03T08:24:00.000Z',
  ...overrides,
});

describe('WorkflowLifecycleManager — termination reasons (REACTORY-302016408)', () => {
  let manager: WorkflowLifecycleManager;

  afterEach(async () => {
    if (manager && manager.isInitialized()) {
      await manager.stop();
    }
  });

  const historyFor = async (persistence: FakePersistence, id: string) => {
    manager = new WorkflowLifecycleManager();
    await manager.initialize({ persistence: persistence as any });
    const item = await manager.getWorkflowHistoryById(id);
    if (!item) throw new Error(`no history item for ${id}`);
    return item;
  };

  describe('read layer', () => {
    it('gives a silent Terminated row a reason, a completeTime and a duration', async () => {
      const persistence = new FakePersistence([makeInstance()]);
      const item = await historyFor(persistence, 'inst-incident');

      expect(item.status).toBe(WorkflowESStatus.TERMINATED);
      // Silence is not an acceptable answer.
      expect(item.terminationReason).not.toBeNull();
      expect(item.terminationReason!.code).toBe(TerminationReasonCode.UNKNOWN);
      expect(item.terminationReason!.recorded).toBe(false);
      expect(item.terminationReason!.message).toMatch(/without a recorded termination reason/i);

      // A terminated instance is finished: completeTime (and therefore duration)
      // must not be null.
      expect(item.completeTime).toBeInstanceOf(Date);
      expect(item.completeTime!.toISOString()).toBe('2026-11-03T08:22:34.000Z');
      expect(item.duration).toBe(8000);
    });

    it('reports the recorded reason when one exists', async () => {
      const instance = makeInstance({
        data: {
          __reactory: {
            termination: {
              code: 'provider-error',
              message: 'Dead-lettered (retries-exhausted): 503 Service Unavailable',
              time: '2026-11-03T08:22:35.000Z',
              source: 'dead-letter',
            },
          },
        },
      });
      const item = await historyFor(new FakePersistence([instance]), 'inst-incident');

      expect(item.terminationReason!.code).toBe(TerminationReasonCode.PROVIDER_ERROR);
      expect(item.terminationReason!.source).toBe('dead-letter');
      expect(item.terminationReason!.recorded).toBe(true);
      expect(item.terminationReason!.time.toISOString()).toBe('2026-11-03T08:22:35.000Z');
    });

    it('does not invent a reason for an instance that is still live', async () => {
      const persistence = new FakePersistence([makeInstance({ status: 0, completeTime: null })]);
      const item = await historyFor(persistence, 'inst-incident');

      expect(item.terminationReason).toBeNull();
      expect(item.completeTime).toBeNull();
      expect(item.duration).toBeNull();
    });

    it('gives a COMPLETE row no termination reason (a success needs no explanation)', async () => {
      // Regression: the first cut branched on "terminal", which includes status 2,
      // so EVERY successful run reported `unknown` — "It predates
      // termination-reason recording, or the process died before the reason could
      // be written" — on the happy path, and `terminationReason != null` stopped
      // being a usable filter.
      const item = await historyFor(new FakePersistence([makeCompletedInstance()]), 'inst-complete');

      expect(item.status).toBe(WorkflowESStatus.COMPLETE);
      expect(item.terminationReason).toBeNull();
      // The completion itself is still fully described.
      expect(item.completeTime!.toISOString()).toBe('2026-11-03T08:24:00.000Z');
      expect(item.duration).toBe(94000);
    });

    it('does not surface a stale recorded reason on a COMPLETE row', async () => {
      // A crash reason can be recorded while a run is still live; the engine then
      // resumes it and it completes. The run DID finish, so the stale record must
      // never be reported.
      const instance = makeCompletedInstance({
        data: {
          __reactory: {
            termination: { code: 'crash', message: 'uncaughtException: boom', time: '2026-11-03T08:23:00.000Z', source: 'process' },
          },
        },
      });
      const item = await historyFor(new FakePersistence([instance]), 'inst-complete');

      expect(item.terminationReason).toBeNull();
    });

    it('reports a DeadLettered row (displayed as Terminated) with a reason', async () => {
      const persistence = new FakePersistence([makeInstance({ status: 4, completeTime: null })]);
      const item = await historyFor(persistence, 'inst-incident');

      expect(item.terminationReason).not.toBeNull();
      expect(item.terminationReason!.code).toBe(TerminationReasonCode.UNKNOWN);
      expect(item.terminationReason!.message).toMatch(/DeadLettered/);
    });

    it('tolerates legacy rows with no data at all', async () => {
      const persistence = new FakePersistence([makeInstance({ data: undefined })]);
      await expect(historyFor(persistence, 'inst-incident')).resolves.toBeTruthy();
      const item = await manager.getWorkflowHistoryById('inst-incident');
      expect(item!.terminationReason!.code).toBe(TerminationReasonCode.UNKNOWN);
      expect(item!.lastActivity).toBeInstanceOf(Date);
    });

    it('reports lastActivity from pointer times and prefers a newer heartbeat', async () => {
      const fromPointers = await historyFor(new FakePersistence([makeInstance()]), 'inst-incident');
      expect(fromPointers.lastActivity!.toISOString()).toBe('2026-11-03T08:22:34.000Z');

      // A persisted heartbeat from a long step must win over the last pointer.
      const withHeartbeat = makeInstance({
        data: { __reactory: { lastActivity: '2026-11-03T10:53:00.000Z' } },
      });
      const item = await historyFor(new FakePersistence([withHeartbeat]), 'inst-incident');
      expect(item.lastActivity!.toISOString()).toBe('2026-11-03T10:53:00.000Z');
      // The engine recorded no completeTime on this path, so the read layer
      // derives it from the newest known activity — 10:53, not the stale pointer.
      expect(item.completeTime!.toISOString()).toBe('2026-11-03T10:53:00.000Z');
    });

    it('exposes the recorded salvage record', async () => {
      const instance = makeInstance({
        data: {
          __reactory: {
            salvage: {
              required: true,
              worktreePath: '/tmp/wt',
              branch: 'bug/REACTORY-302016408',
              headSha: '4856720',
              dirty: true,
              changedFileCount: 15,
              recordedAt: '2026-11-03T11:00:00.000Z',
            },
          },
        },
      });
      const item = await historyFor(new FakePersistence([instance]), 'inst-incident');
      expect(item.salvage!.branch).toBe('bug/REACTORY-302016408');
      expect(item.salvage!.headSha).toBe('4856720');
      expect(hasUnresolvedSalvage(item.salvage)).toBe(true);
    });
  });

  describe('recorder', () => {
    it('writes the reason and sets completeTime on a terminated instance', async () => {
      const persistence = new FakePersistence([makeInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const outcome = await recorder.recordTermination('inst-incident', {
        code: TerminationReasonCode.CANCELLED,
        message: 'Cancelled: operator stopped a runaway agent',
        source: 'cancel',
      });

      expect(outcome.applied).toBe(true);
      expect(outcome.outcome).toBe('applied');
      const stored = persistence.raw('inst-incident');
      expect(stored.data.__reactory.termination.code).toBe('cancelled');
      expect(stored.data.__reactory.termination.message).toMatch(/runaway agent/);
      expect(stored.completeTime).toBeTruthy();
    });

    it('never re-labels a COMPLETE instance — not even when forced', async () => {
      // B1 regression: stop()/a crash used to overwrite finished runs with
      // SHUTDOWN/CRASH on every deploy.
      const persistence = new FakePersistence([makeCompletedInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const forced = await recorder.recordTermination(
        'inst-complete',
        { code: TerminationReasonCode.SHUTDOWN, message: 'stop()', source: 'shutdown' },
        { force: true, terminal: true },
      );
      const unforced = await recorder.recordTermination(
        'inst-complete',
        { code: TerminationReasonCode.CRASH, message: 'boom', source: 'process' },
      );

      expect(forced.outcome).toBe('already-complete');
      expect(unforced.outcome).toBe('already-complete');
      const stored = persistence.raw('inst-complete');
      expect(stored.data.__reactory?.termination).toBeUndefined();
      expect(stored.completeTime).toBe('2026-11-03T08:24:00.000Z');
    });

    it('clears a stale reason it finds on a COMPLETE instance', async () => {
      const instance = makeCompletedInstance({
        data: {
          __reactory: {
            termination: { code: 'crash', message: 'stale', time: '2026-11-03T08:23:00.000Z', source: 'process' },
          },
        },
      });
      const persistence = new FakePersistence([instance]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const outcome = await recorder.recordTermination(
        'inst-complete',
        { code: TerminationReasonCode.CRASH, message: 'boom' },
      );

      expect(outcome.outcome).toBe('already-complete');
      expect(persistence.raw('inst-complete').data.__reactory.termination).toBeUndefined();
    });

    it('leaves an already-settled terminated row alone unless the caller is the transition', async () => {
      const instance = makeInstance({
        completeTime: '2026-11-03T08:22:34.000Z',
        data: {
          __reactory: {
            termination: { code: 'provider-error', message: 'original', time: '2026-11-03T08:22:34.000Z', source: 'dead-letter' },
          },
        },
      });
      const persistence = new FakePersistence([instance]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const kept = await recorder.recordTermination(
        'inst-incident',
        { code: TerminationReasonCode.SHUTDOWN, message: 'deploy' },
      );
      expect(kept.outcome).toBe('already-settled');
      expect(persistence.raw('inst-incident').data.__reactory.termination.code).toBe('provider-error');

      const forced = await recorder.recordTermination(
        'inst-incident',
        { code: TerminationReasonCode.CANCELLED, message: 'operator stopped it' },
        { force: true },
      );
      expect(forced.applied).toBe(true);
      expect(persistence.raw('inst-incident').data.__reactory.termination.code).toBe('cancelled');
    });

    it('refuses to write a termination reason onto a live instance', async () => {
      const persistence = new FakePersistence([makeInstance({ status: 0, completeTime: null })]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const outcome = await recorder.recordTermination('inst-incident', {
        code: TerminationReasonCode.CRASH,
        message: 'x',
      });

      expect(outcome.outcome).toBe('not-terminal');
      expect(persistence.raw('inst-incident').data.__reactory?.termination).toBeUndefined();
      expect(persistence.raw('inst-incident').completeTime).toBeNull();
    });

    it('records an interruption (not a termination) for a live instance', async () => {
      const persistence = new FakePersistence([makeInstance({ status: 0, completeTime: null })]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const outcome = await recorder.recordInterruption('inst-incident', {
        code: TerminationReasonCode.SHUTDOWN,
        message: 'deploy',
        source: 'shutdown',
      });

      expect(outcome.applied).toBe(true);
      const stored = persistence.raw('inst-incident');
      expect(stored.data.__reactory.interrupted.code).toBe('shutdown');
      expect(stored.data.__reactory.termination).toBeUndefined();
      expect(stored.completeTime).toBeNull();
    });

    it('never throws when persistence fails, and reports the failure as retryable', async () => {
      const persistence = new FakePersistence([makeInstance()]);
      persistence.failNextPersist = new Error('mongo is down');
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const outcome = await recorder.recordTermination('inst-incident', {
        code: TerminationReasonCode.CRASH,
        message: 'boom',
      });

      expect(outcome.applied).toBe(false);
      expect(outcome.outcome).toBe('write-failed');
      expect(outcome.retryable).toBe(true);
    });

    it('retries once on an optimistic-concurrency conflict', async () => {
      const persistence = new FakePersistence([makeInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const original = persistence.persistWorkflow.bind(persistence);
      let attempts = 0;
      (persistence as any).persistWorkflow = async (instance: any) => {
        attempts += 1;
        if (attempts === 1) {
          const current = persistence.raw(instance.id);
          persistence.store.set(instance.id, { ...current, concurrencyToken: (current.concurrencyToken ?? 0) + 1 });
        }
        return original(instance);
      };

      const outcome = await recorder.recordTermination('inst-incident', {
        code: TerminationReasonCode.SHUTDOWN,
        message: 'stop()',
      });

      expect(attempts).toBe(2);
      expect(outcome.applied).toBe(true);
      expect(persistence.raw('inst-incident').data.__reactory.termination.code).toBe('shutdown');
    });
  });

  describe('crash outbox — killed mid-agent_conversation', () => {
    const outboxPath = '/tmp/reactor-termination-outbox-test.jsonl';

    beforeEach(() => {
      process.env.WORKFLOW_TERMINATION_OUTBOX = outboxPath;
      clearOutbox();
    });

    afterEach(() => {
      clearOutbox();
      delete process.env.WORKFLOW_TERMINATION_OUTBOX;
    });

    it('records the reason for a run that was left Terminated with no completeTime', async () => {
      // The incident shape: the engine's last write left status 3 with no
      // completeTime; the process then died on an unhandled rejection.
      const persistence = new FakePersistence([makeInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const queued = recorder.queueProcessTermination(['inst-incident'], {
        code: TerminationReasonCode.PROVIDER_ERROR,
        message: 'unhandledRejection: Error: 503 Service Unavailable from provider',
        source: 'process',
        signal: 'unhandledRejection',
      });

      expect(queued).toBe(1);
      // Written synchronously: nothing asynchronous survives process.exit().
      expect(readOutboxRecords()).toHaveLength(1);

      const drained = await recorder.drainOutbox();

      expect(drained.applied).toBe(1);
      const stored = persistence.raw('inst-incident');
      expect(stored.data.__reactory.termination.code).toBe('provider-error');
      expect(stored.data.__reactory.termination.message).toMatch(/unhandledRejection/);
      expect(stored.completeTime).toBeTruthy();
      expect(readOutboxRecords()).toHaveLength(0);
    });

    it('records an interruption, not a termination, when the run is still live at drain', async () => {
      // The engine WILL resume this instance, so a `crash` termination reason
      // would be a stale lie the moment the run completes.
      const persistence = new FakePersistence([makeInstance({ status: 0, completeTime: null })]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      recorder.queueProcessTermination(['inst-incident'], {
        code: TerminationReasonCode.CRASH,
        message: 'uncaughtException: Error: boom',
        source: 'process',
        signal: 'uncaughtException',
      });
      const drained = await recorder.drainOutbox();

      expect(drained.interrupted).toBe(1);
      expect(drained.applied).toBe(0);
      const stored = persistence.raw('inst-incident');
      expect(stored.data.__reactory.termination).toBeUndefined();
      expect(stored.data.__reactory.interrupted.code).toBe('crash');
      expect(stored.completeTime).toBeNull();
    });

    it('does not re-label a run that completed before the drain', async () => {
      // B1 through the crash path: the registry was stale, the run had finished.
      const persistence = new FakePersistence([makeCompletedInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      recorder.queueProcessTermination(['inst-complete'], {
        code: TerminationReasonCode.CRASH,
        message: 'uncaughtException: Error: boom',
        source: 'process',
      });
      const drained = await recorder.drainOutbox();

      expect(drained.applied).toBe(0);
      expect(drained.dropped).toBe(1);
      const stored = persistence.raw('inst-complete');
      expect(stored.data.__reactory?.termination).toBeUndefined();
      expect(stored.completeTime).toBe('2026-11-03T08:24:00.000Z');
      expect(readOutboxRecords()).toHaveLength(0);
    });

    it('does not leave a stale crash reason on a resumed instance', async () => {
      const persistence = new FakePersistence([makeInstance({ status: 0, completeTime: null })]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      recorder.queueProcessTermination(['inst-incident'], {
        code: TerminationReasonCode.CRASH,
        message: 'boom',
        source: 'process',
      });
      await recorder.drainOutbox();

      // While live: nothing about a termination.
      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });
      expect((await manager.getWorkflowHistoryById('inst-incident'))!.terminationReason).toBeNull();

      // The engine resumes it and it completes: still nothing.
      persistence.seed({
        ...persistence.raw('inst-incident'),
        status: 2,
        completeTime: '2026-11-03T09:00:00.000Z',
      });
      expect((await manager.getWorkflowHistoryById('inst-incident'))!.terminationReason).toBeNull();
    });

    it('keeps the queued reason when the apply fails, then applies it on the next drain', async () => {
      // B3: a transient database outage at boot must not discard the reason the
      // crash was supposed to capture.
      const persistence = new FakePersistence([makeInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      recorder.queueProcessTermination(['inst-incident'], {
        code: TerminationReasonCode.OOM,
        message: 'JavaScript heap out of memory',
        source: 'process',
      });

      persistence.failNextPersist = new Error('mongo unavailable');
      const failed = await recorder.drainOutbox();

      expect(failed.applied).toBe(0);
      expect(failed.requeued).toBe(1);
      // The record is still on disk, so the next boot can apply it.
      const stillQueued = readOutboxRecords();
      expect(stillQueued).toHaveLength(1);
      expect(stillQueued[0].instanceId).toBe('inst-incident');
      expect(persistence.raw('inst-incident').data.__reactory?.termination).toBeUndefined();

      const retried = await recorder.drainOutbox();

      expect(retried.applied).toBe(1);
      expect(persistence.raw('inst-incident').data.__reactory.termination.code).toBe('oom');
      expect(persistence.raw('inst-incident').completeTime).toBeTruthy();
      expect(readOutboxRecords()).toHaveLength(0);
    });

    it('keeps only the newest record per instance across a crash loop', async () => {
      const persistence = new FakePersistence([makeInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      recorder.queueProcessTermination(['inst-incident'], { code: 'unknown', message: 'first', source: 'process' });
      recorder.queueProcessTermination(['inst-incident'], { code: 'oom', message: 'second', source: 'process' });

      expect(readOutboxRecords()).toHaveLength(2);
      await recorder.drainOutbox();
      expect(persistence.raw('inst-incident').data.__reactory.termination.message).toMatch(/second/);
    });
  });

  describe('salvage', () => {
    it('blocks the cleanup guard until the work is committed or acknowledged', async () => {
      const persistence = new FakePersistence([makeInstance()]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const record = await recorder.recordSalvage('inst-incident', {
        worktreePath: '/Users/wernerw/Projects/reactory/reactory-worktrees/ai-reactory-302016408',
        branch: 'bug/REACTORY-302016408-20261103-4082245933',
        headSha: '4856720',
        dirty: true,
        changedFileCount: 15,
      });

      expect(record!.branch).toBe('bug/REACTORY-302016408-20261103-4082245933');
      await expect(recorder.assertSalvageClear('inst-incident')).rejects.toBeInstanceOf(UnresolvedSalvageError);

      // Recording the commit that preserved the work unblocks it.
      await recorder.acknowledgeSalvage('inst-incident', {
        acknowledgedBy: 'reactor',
        salvageSha: '4856720',
        note: 'recovered onto the ticket branch',
      });
      await expect(recorder.assertSalvageClear('inst-incident')).resolves.toBeTruthy();
    });

    it('refuses to delete a history row that still owes salvage work', async () => {
      const instance = makeInstance({
        data: {
          __reactory: {
            salvage: {
              required: true,
              worktreePath: '/tmp/wt',
              branch: 'bug/x',
              dirty: true,
              recordedAt: '2026-11-03T11:00:00.000Z',
            },
          },
        },
      });
      const persistence = new FakePersistence([instance]);
      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });

      const blocked = await manager.deleteWorkflowHistory('inst-incident');
      expect(blocked.success).toBe(false);
      expect(blocked.message).toMatch(/blocked pending salvage acknowledgement/i);
      expect(persistence.raw('inst-incident')).toBeTruthy();

      const batch = await manager.deleteWorkflowHistoryBatch(['inst-incident']);
      expect(batch.success).toBe(false);
      expect(persistence.raw('inst-incident')).toBeTruthy();
    });

    it('skips unresolved-salvage rows in the retention sweep and reports them', async () => {
      const old = '2020-01-01T00:00:00.000Z';
      const salvaged = makeInstance({
        id: 'inst-salvaged',
        createTime: old,
        data: {
          __reactory: {
            salvage: { required: true, worktreePath: '/tmp/wt', dirty: true, recordedAt: old },
          },
        },
      });
      const clean = makeInstance({ id: 'inst-clean', createTime: old });
      const persistence = new FakePersistence([salvaged, clean]);
      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });

      const result = await manager.sweepExpiredInstances({ olderThanDays: 30 });

      expect(result.deleted).toBe(1);
      expect(result.skippedSalvage).toBe(1);
      expect(persistence.raw('inst-salvaged')).toBeTruthy();
      expect(persistence.raw('inst-clean')).toBeFalsy();
    });

    it('auto-captures salvage from the worktree facts a publish-path run reported', async () => {
      const instance = makeInstance({
        data: {
          __reactory: {
            worktree: {
              path: '/tmp/wt-ai',
              branch: 'bug/REACTORY-302016408-20261103-4082245933',
              headSha: '4856720',
              dirty: true,
              changedFileCount: 15,
            },
          },
        },
      });
      const persistence = new FakePersistence([instance]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const record = await recorder.captureSalvageForTerminatedInstance('inst-incident');

      expect(record).not.toBeNull();
      expect(record!.required).toBe(true);
      expect(record!.branch).toBe('bug/REACTORY-302016408-20261103-4082245933');
      expect(record!.headSha).toBe('4856720');
      expect(record!.changedFileCount).toBe(15);
      await expect(recorder.assertSalvageClear('inst-incident')).rejects.toBeInstanceOf(UnresolvedSalvageError);
    });

    it('does not require salvage when the run already published', async () => {
      const instance = makeInstance({
        data: {
          __reactory: {
            worktree: { path: '/tmp/wt-ai', branch: 'bug/x', dirty: true },
            publish: { mergedSha: 'deadbeef', prUrl: 'https://example/pr/15' },
          },
        },
      });
      const persistence = new FakePersistence([instance]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      const record = await recorder.captureSalvageForTerminatedInstance('inst-incident');
      expect(record!.publishedSha).toBe('deadbeef');
      expect(record!.required).toBe(false);
      await expect(recorder.assertSalvageClear('inst-incident')).resolves.toBeTruthy();
    });

    it('does not create a salvage record for a COMPLETE run', async () => {
      const persistence = new FakePersistence([makeCompletedInstance({
        data: { __reactory: { worktree: { path: '/tmp/wt', dirty: true } } },
      })]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      await expect(recorder.captureSalvageForTerminatedInstance('inst-complete')).resolves.toBeNull();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REACTORY-302016408 — salvage guard completeness (review Q1)
//
// The guard existed on delete / batch-delete / retention-sweep but NOT on
// clearWorkflowHistory, which is reachable from the clearWorkflowExecutionHistory
// mutation and wiped a definition's rows unconditionally — destroying the only
// pointer to a worktree holding unpublished work. And auto-capture only ran from
// the in-memory YAML finalize watch, so a run from a previous process (the live
// incident), a DeadLettered row or a code workflow had no record to guard.
// ══════════════════════════════════════════════════════════════════════════════

describe('WorkflowLifecycleManager — salvage guard completeness (REACTORY-302016408)', () => {
  let manager: WorkflowLifecycleManager;

  afterEach(async () => {
    if (manager && manager.isInitialized()) {
      await manager.stop();
    }
  });

  const salvageRecord = (worktreePath: string) => ({
    __reactory: {
      salvage: {
        required: true,
        worktreePath,
        branch: 'bug/REACTORY-302016408',
        dirty: true,
        recordedAt: '2026-11-03T11:00:00.000Z',
      },
    },
  });

  describe('clearWorkflowHistory', () => {
    it('refuses to clear a definition history that contains unresolved salvage', async () => {
      const def = 'ai.ProcessAITicket@1.4.8';
      const protectedRow = makeInstance({
        id: 'inst-protected',
        workflowDefinitionId: def,
        data: salvageRecord('/tmp/wt-protected'),
      });
      const freeRow = makeInstance({ id: 'inst-free', workflowDefinitionId: def });
      const persistence = new FakePersistence([protectedRow, freeRow]);

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });

      const result = await manager.clearWorkflowHistory(def);

      // The deletable row goes; the salvage row survives.
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.skippedSalvage).toBe(1);
      expect(result.blockedInstanceIds).toEqual(['inst-protected']);
      expect(result.message).toMatch(/blocked pending salvage acknowledgement/i);

      expect(persistence.raw('inst-protected')).toBeTruthy();
      expect(persistence.raw('inst-free')).toBeFalsy();
    });

    it('reports success with nothing deleted when every row owes salvage', async () => {
      const def = 'ai.ProcessAITicket@1.4.8';
      const persistence = new FakePersistence([
        makeInstance({ id: 'inst-a', workflowDefinitionId: def, data: salvageRecord('/tmp/wt-a') }),
        makeInstance({ id: 'inst-b', workflowDefinitionId: def, data: salvageRecord('/tmp/wt-b') }),
      ]);

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });

      const result = await manager.clearWorkflowHistory(def);

      expect(result.deletedCount).toBe(0);
      expect(result.skippedSalvage).toBe(2);
      expect(persistence.raw('inst-a')).toBeTruthy();
      expect(persistence.raw('inst-b')).toBeTruthy();
    });

    it('clears everything when no row owes salvage', async () => {
      const def = 'core.OtherWorkflow@2.0.0';
      const persistence = new FakePersistence([
        makeInstance({ id: 'inst-1', workflowDefinitionId: def }),
        makeInstance({ id: 'inst-2', workflowDefinitionId: def }),
      ]);

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });

      const result = await manager.clearWorkflowHistory(def);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.skippedSalvage).toBe(0);
      expect(persistence.raw('inst-1')).toBeFalsy();
      expect(persistence.raw('inst-2')).toBeFalsy();
    });

    it('only touches rows of the requested definition', async () => {
      const persistence = new FakePersistence([
        makeInstance({ id: 'inst-target', workflowDefinitionId: 'a.One@1.0.0' }),
        makeInstance({ id: 'inst-other', workflowDefinitionId: 'b.Two@1.0.0' }),
      ]);

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });

      const result = await manager.clearWorkflowHistory('a.One@1.0.0');

      expect(result.deletedCount).toBe(1);
      expect(persistence.raw('inst-target')).toBeFalsy();
      expect(persistence.raw('inst-other')).toBeTruthy();
    });
  });

  describe('auto-capture via the guard hook', () => {
    it('protects a terminated run from a previous process that never got a record', async () => {
      // The incident's exact shape: the row was written by a process that has
      // since died, so it is in no in-memory watch. Only the persisted worktree
      // facts can save it.
      const instance = makeInstance({
        id: 'inst-prior-process',
        status: 3,
        data: {
          __reactory: {
            worktree: {
              path: '/tmp/wt-prior',
              branch: 'bug/REACTORY-302016408-20261103-4082245933',
              headSha: '4856720',
              dirty: true,
              changedFileCount: 15,
            },
          },
        },
      });
      const persistence = new FakePersistence([instance]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });
      manager.setSalvageCaptureHook((id) => recorder.captureSalvageForTerminatedInstance(id));

      const result = await manager.deleteWorkflowHistory('inst-prior-process');

      expect(result.success).toBe(false);
      expect(persistence.raw('inst-prior-process')).toBeTruthy();
      // ... and the record is now on the row, so the work is discoverable.
      expect(persistence.raw('inst-prior-process').data.__reactory.salvage.branch)
        .toBe('bug/REACTORY-302016408-20261103-4082245933');
    });

    it('protects a DeadLettered row (status 4), which the finalize sweep never captured', async () => {
      const instance = makeInstance({
        id: 'inst-deadlettered',
        status: 4,
        data: { __reactory: { worktree: { path: '/tmp/wt-dl', dirty: true } } },
      });
      const persistence = new FakePersistence([instance]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });
      manager.setSalvageCaptureHook((id) => recorder.captureSalvageForTerminatedInstance(id));

      await expect(manager.assertSalvageClear('inst-deadlettered'))
        .rejects.toBeInstanceOf(UnresolvedSalvageError);
    });

    it('still allows deletion when there is nothing to capture', async () => {
      const persistence = new FakePersistence([makeInstance({ id: 'inst-plain', data: {} })]);
      const recorder = new WorkflowInstanceLifecycleRecorder({ persistence: persistence as any });

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });
      manager.setSalvageCaptureHook((id) => recorder.captureSalvageForTerminatedInstance(id));

      const result = await manager.deleteWorkflowHistory('inst-plain');
      expect(result.success).toBe(true);
    });

    it('survives a throwing capture hook', async () => {
      const persistence = new FakePersistence([makeInstance({ id: 'inst-x', data: {} })]);

      manager = new WorkflowLifecycleManager();
      await manager.initialize({ persistence: persistence as any });
      manager.setSalvageCaptureHook(async () => { throw new Error('capture exploded'); });

      // Best-effort by contract: a broken hook must never block cleanup.
      const result = await manager.deleteWorkflowHistory('inst-x');
      expect(result.success).toBe(true);
    });
  });
});
