import WorkflowResolver from '../WorkflowResolver';
import * as fs from 'fs';
import * as path from 'path';
import { 
  IReactoryWorkflowService,
  IWorkflowExecutionInput,
  IScheduleConfigInput,
  IUpdateScheduleInput,
  IWorkflowFilterInput,
  IInstanceFilterInput,
  IAuditFilterInput,
  IPaginationInput
} from '../../../services/Workflow/types';

describe('WorkflowResolver', () => {
  let resolver: WorkflowResolver;
  let mockContext: any;
  let mockWorkflowService: jest.Mocked<IReactoryWorkflowService>;

  beforeEach(() => {
    // Create mock workflow service
    mockWorkflowService = {
      name: 'ReactoryWorkflowService',
      nameSpace: 'core',
      version: '1.0.0',
      context: null as any,
      props: {},
      workflowRunner: null as any,
      onStartup: jest.fn(),
      getExecutionContext: jest.fn(),
      setExecutionContext: jest.fn(),
      getSystemStatus: jest.fn(),
      getWorkflowMetrics: jest.fn(),
      getWorkflowConfigurations: jest.fn(),
      getWorkflows: jest.fn(),
      getWorkflowRegistry: jest.fn(),
      getWorkflowWithId: jest.fn(),
      getWorkflow: jest.fn(),
      getWorkflowInstances: jest.fn(),
      getWorkflowInstance: jest.fn(),
      startWorkflow: jest.fn(),
      pauseWorkflowInstance: jest.fn(),
      resumeWorkflowInstance: jest.fn(),
      cancelWorkflowInstance: jest.fn(),
      getWorkflowHistory: jest.fn(),
      getWorkflowHistoryById: jest.fn(),
      getWorkflowHistoryByDefinitionId: jest.fn(),
      getWorkflowHistoryByStatus: jest.fn(),
      getWorkflowExecutionStats: jest.fn(),
      searchWorkflowHistory: jest.fn(),
      getRecentWorkflowExecutions: jest.fn(),
      deleteWorkflowHistory: jest.fn(),
      deleteWorkflowHistoryBatch: jest.fn(),
      clearWorkflowHistory: jest.fn(),
      getWorkflowSchedules: jest.fn(),
      getWorkflowSchedule: jest.fn(),
      createWorkflowSchedule: jest.fn(),
      updateWorkflowSchedule: jest.fn(),
      deleteWorkflowSchedule: jest.fn(),
      startSchedule: jest.fn(),
      stopSchedule: jest.fn(),
      reloadSchedules: jest.fn(),
      getSchedulesForWorkflow: jest.fn(),
      getWorkflowSchedulesForWorkflowId: jest.fn(),
      filterSchedulesByWorkflowProperties: jest.fn(),
      getWorkflowAuditLog: jest.fn(),
      getWorkflowStatus: jest.fn(),
      startWorkflowLegacy: jest.fn(),
      recordWorkflowSalvage: jest.fn(),
      acknowledgeWorkflowSalvage: jest.fn(),
    } as any;

    // Create mock context
    mockContext = {
      user: {
        id: 'test-user-123',
        roles: ['ADMIN', 'WORKFLOW_ADMIN']
      },
      getService: jest.fn().mockReturnValue(mockWorkflowService),
      log: jest.fn(),
      hasRole: jest.fn().mockReturnValue(true)
    };

    resolver = new WorkflowResolver();
  });

  describe('System Status & Health Queries', () => {
    describe('getSystemStatus', () => {
      it('should return system status', async () => {
        const mockStatus = {
          system: { initialized: true, status: 'HEALTHY' },
          lifecycle: { totalWorkflows: 10 },
          errors: [],
          configuration: {},
          security: {}
        };
        mockWorkflowService.getSystemStatus.mockResolvedValue(mockStatus);

        const result = await resolver.getSystemStatus({}, {}, mockContext);

        expect(result).toEqual(mockStatus);
        expect(mockWorkflowService.getSystemStatus).toHaveBeenCalled();
      });
    });

    describe('getWorkflowMetrics', () => {
      it('should return workflow metrics', async () => {
        const mockMetrics = {
          lifecycle: { totalWorkflows: 10 },
          scheduler: { activeSchedules: 5 },
          errors: [],
          configuration: {},
          security: {}
        };
        mockWorkflowService.getWorkflowMetrics.mockResolvedValue(mockMetrics);

        const result = await resolver.getWorkflowMetrics({}, {}, mockContext);

        expect(result).toEqual(mockMetrics);
        expect(mockWorkflowService.getWorkflowMetrics).toHaveBeenCalled();
      });
    });

    describe('getWorkflowConfigurations', () => {
      it('should return workflow configurations', async () => {
        const mockConfigs = {
          configurations: {},
          validation: { isValid: true }
        };
        mockWorkflowService.getWorkflowConfigurations.mockResolvedValue(mockConfigs);

        const result = await resolver.getWorkflowConfigurations({}, {}, mockContext);

        expect(result).toEqual(mockConfigs);
        expect(mockWorkflowService.getWorkflowConfigurations).toHaveBeenCalled();
      });
    });
  });

  describe('Workflow Registry Queries', () => {
    describe('getWorkflows', () => {
      it('should return paginated workflows', async () => {
        const filter: IWorkflowFilterInput = { nameSpace: 'core' };
        const pagination: IPaginationInput = { page: 1, limit: 10 };
        const mockResult = {
          workflows: [{ id: '1', name: 'Test' }],
          pagination: { page: 1, pages: 1, limit: 10, total: 1 }
        };
        mockWorkflowService.getWorkflows.mockResolvedValue(mockResult);

        const result = await resolver.getWorkflows({}, { filter, pagination }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          filter,
          pagination,
          expect.objectContaining({ includeStatistics: false })
        );
      });

      it('should work without filters', async () => {
        const mockResult = {
          workflows: [],
          pagination: { page: 1, pages: 0, limit: 10, total: 0 }
        };
        mockWorkflowService.getWorkflows.mockResolvedValue(mockResult);

        const result = await resolver.getWorkflows({}, {}, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          undefined,
          undefined,
          expect.objectContaining({ includeStatistics: false })
        );
      });

      // Statistics are opt-in: the resolver must forward the flag explicitly so the
      // service never performs the expensive instance aggregation unless asked. The
      // default MUST be false - the support-ticket AI action calls this query just to
      // discover the newest registered version, and paying for statistics there is
      // what made that dialog spin for minutes.
      it('does NOT request statistics by default', async () => {
        mockWorkflowService.getWorkflows.mockResolvedValue({
          workflows: [],
          pagination: { page: 1, pages: 0, limit: 10, total: 0 }
        });

        await resolver.getWorkflows({}, {}, mockContext);

        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          undefined,
          undefined,
          expect.objectContaining({ includeStatistics: false })
        );
      });

      it('forwards includeStatistics: true when the caller opts in', async () => {
        mockWorkflowService.getWorkflows.mockResolvedValue({
          workflows: [],
          pagination: { page: 1, pages: 0, limit: 10, total: 0 }
        });

        await resolver.getWorkflows(
          {},
          { includeStatistics: true, statsMaxAgeMs: 5000 },
          mockContext
        );

        expect(mockWorkflowService.getWorkflows).toHaveBeenCalledWith(
          undefined,
          undefined,
          { includeStatistics: true, statsMaxAgeMs: 5000 }
        );
      });
    });

    describe('getWorkflowRegistry', () => {
      it('should return workflow registry', async () => {
        const mockRegistry = {
          workflows: [{ id: '1', name: 'Test' }],
          stats: { totalWorkflows: 1 }
        };
        mockWorkflowService.getWorkflowRegistry.mockResolvedValue(mockRegistry);

        const result = await resolver.getWorkflowRegistry({}, {}, mockContext);

        expect(result).toEqual(mockRegistry);
        expect(mockWorkflowService.getWorkflowRegistry).toHaveBeenCalled();
      });
    });

    describe('getWorkflow', () => {
      it('should return workflow by namespace and name', async () => {
        const mockWorkflow = [{ id: 'core.TestWorkflow@1.0.0', name: 'TestWorkflow' }];
        mockWorkflowService.getWorkflow.mockResolvedValue(mockWorkflow);

        const result = await resolver.getWorkflow({}, { namespace: 'core', name: 'TestWorkflow' }, mockContext);

        expect(result).toEqual(mockWorkflow);
        expect(mockWorkflowService.getWorkflow).toHaveBeenCalledWith('core', 'TestWorkflow');
      });
    });

    describe('getWorkflowWithId', () => {
      it('should return workflow by ID', async () => {
        const mockWorkflow = {
          id: 'core.TestWorkflow@1.0.0',
          name: 'TestWorkflow',
          nameSpace: 'core',
          version: '1.0.0'
        };
        mockWorkflowService.getWorkflowWithId.mockResolvedValue(mockWorkflow);

        const result = await resolver.getWorkflowWithId({}, { id: 'core.TestWorkflow@1.0.0' }, mockContext);

        expect(result).toEqual(mockWorkflow);
        expect(mockWorkflowService.getWorkflowWithId).toHaveBeenCalledWith('core.TestWorkflow@1.0.0');
      });
    });
  });

  describe('Workflow Instance Queries', () => {
    describe('getWorkflowInstances', () => {
      it('should return paginated instances', async () => {
        const filter: IInstanceFilterInput = { workflowName: 'Test' };
        const pagination: IPaginationInput = { page: 1, limit: 10 };
        const mockResult = {
          instances: [{ id: 'inst-1', status: 'COMPLETED' }],
          pagination: { page: 1, pages: 1, limit: 10, total: 1 }
        };
        mockWorkflowService.getWorkflowInstances.mockResolvedValue(mockResult);

        const result = await resolver.getWorkflowInstances({}, { filter, pagination }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.getWorkflowInstances).toHaveBeenCalledWith(filter, pagination);
      });
    });

    describe('getWorkflowInstance', () => {
      it('should return specific instance', async () => {
        const mockInstance = { id: 'inst-123', status: 'RUNNING' };
        mockWorkflowService.getWorkflowInstance.mockResolvedValue(mockInstance);

        const result = await resolver.getWorkflowInstance({}, { id: 'inst-123' }, mockContext);

        expect(result).toEqual(mockInstance);
        expect(mockWorkflowService.getWorkflowInstance).toHaveBeenCalledWith('inst-123');
      });
    });

    describe('getWorkflowInstanceLogFileUrl', () => {
      it('forwards the tenant public key and a short-lived JWT for the protected CDN log path', async () => {
        const dataRoot = process.env.REACTORY_DATA || process.env.APP_DATA_ROOT;
        const nameSpace = 'demo';
        const name = 'LoggingWorkflow';
        const version = '1.0.0';
        const instanceId = `test-instance-${Date.now()}`;
        const logDir = path.join(dataRoot, 'workflows', 'catalog', nameSpace, name, version, 'logs');
        const logPath = path.join(logDir, `${instanceId}.log`);

        fs.mkdirSync(logDir, { recursive: true });
        fs.writeFileSync(logPath, '[2026-01-01T00:00:00.000Z] [INFO] hello\n');

        mockWorkflowService.getWorkflowHistoryById.mockResolvedValue({
          workflowDefinitionId: `${nameSpace}.${name}@${version}`,
        });

        const ctx: any = {
          ...mockContext,
          user: { _id: instanceId, firstName: 'Test', lastName: 'User' },
          request: {
            headers: {
              'x-client-id': 'reactory',
              'x-client-key': 'reactory',
              'x-client-public-key': 'reactory-local-public-key',
            },
          },
        };

        const url = await resolver.getWorkflowInstanceLogFileUrl({}, { instanceId }, ctx);

        expect(url).toContain(
          `/workflows/catalog/${nameSpace}/${name}/${version}/logs/${instanceId}.log`,
        );
        // The tenant credential must travel on the URL — /cdn/workflows/ is not an
        // exempt route, so the public key is what the tenant middleware validates.
        expect(url).toContain('x-client-key=reactory');
        expect(url).toContain('x-client-public-key=reactory-local-public-key');
        // A user-scoped token is minted for the download (and it is not the 24h default).
        expect(url).toContain('auth_token=');

        fs.unlinkSync(logPath);
      });

      it('returns null when the instance has no log file', async () => {
        mockWorkflowService.getWorkflowHistoryById.mockResolvedValue({
          workflowDefinitionId: 'demo.LoggingWorkflow@1.0.0',
        });

        const url = await resolver.getWorkflowInstanceLogFileUrl(
          {},
          { instanceId: `missing-${Date.now()}` },
          mockContext,
        );

        expect(url).toBeNull();
      });
    });
  });

  describe('Workflow Schedule Queries', () => {
    describe('getWorkflowSchedules', () => {
      it('should return paginated schedules', async () => {
        const pagination: IPaginationInput = { page: 1, limit: 10 };
        const mockResult = {
          schedules: [{ id: 'sched-1', enabled: true }],
          pagination: { page: 1, pages: 1, limit: 10, total: 1 }
        };
        mockWorkflowService.getWorkflowSchedules.mockResolvedValue(mockResult);

        const result = await resolver.getWorkflowSchedules({}, { pagination }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.getWorkflowSchedules).toHaveBeenCalledWith(pagination);
      });
    });

    describe('getWorkflowSchedule', () => {
      it('should return schedules for a specific workflow ID', async () => {
        const mockSchedules = [{ id: 'sched-123', enabled: true }];
        mockWorkflowService.getWorkflowSchedulesForWorkflowId.mockResolvedValue(mockSchedules);

        const result = await resolver.getWorkflowSchedule({}, { id: 'core.TestWorkflow@1.0.0' }, mockContext);

        expect(result).toEqual(mockSchedules);
        expect(mockWorkflowService.getWorkflowSchedulesForWorkflowId).toHaveBeenCalledWith('core.TestWorkflow@1.0.0');
      });
    });
  });

  describe('Workflow Mutations', () => {
    describe('startWorkflow', () => {
      it('should start a workflow', async () => {
        const input: IWorkflowExecutionInput = { input: { key: 'value' } };
        const mockResult = { instanceId: 'inst-123', status: 'RUNNING' };
        mockWorkflowService.startWorkflow.mockResolvedValue(mockResult);

        const result = await resolver.startWorkflow({}, { workflowId: 'core.Test@1.0.0', input }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.startWorkflow).toHaveBeenCalledWith('core.Test@1.0.0', input);
      });
    });

    describe('pauseWorkflowInstance', () => {
      it('should pause a workflow instance', async () => {
        const mockResult = { success: true, message: 'Paused' };
        mockWorkflowService.pauseWorkflowInstance.mockResolvedValue(mockResult);

        const result = await resolver.pauseWorkflowInstance({}, { instanceId: 'inst-123' }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.pauseWorkflowInstance).toHaveBeenCalledWith('inst-123');
      });
    });

    describe('resumeWorkflowInstance', () => {
      it('should resume a workflow instance', async () => {
        const mockResult = { success: true, message: 'Resumed' };
        mockWorkflowService.resumeWorkflowInstance.mockResolvedValue(mockResult);

        const result = await resolver.resumeWorkflowInstance({}, { instanceId: 'inst-123' }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.resumeWorkflowInstance).toHaveBeenCalledWith('inst-123');
      });
    });

    describe('cancelWorkflowInstance', () => {
      it('should cancel a workflow instance', async () => {
        const mockResult = { success: true, message: 'Cancelled' };
        mockWorkflowService.cancelWorkflowInstance.mockResolvedValue(mockResult);

        const result = await resolver.cancelWorkflowInstance({}, { instanceId: 'inst-123' }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.cancelWorkflowInstance).toHaveBeenCalledWith('inst-123');
      });
    });
  });

  describe('Schedule Mutations', () => {
    describe('createWorkflowSchedule', () => {
      it('should create a new schedule', async () => {
        const config: IScheduleConfigInput = {
          workflowId: 'core.Test@1.0.0',
          cronExpression: '0 0 * * *',
          enabled: true
        };
        const mockResult = { id: 'sched-123', ...config };
        mockWorkflowService.createWorkflowSchedule.mockResolvedValue(mockResult);

        const result = await resolver.createWorkflowSchedule({}, { config }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.createWorkflowSchedule).toHaveBeenCalledWith(config);
      });
    });

    describe('updateWorkflowSchedule', () => {
      it('should update a schedule', async () => {
        const updates: IUpdateScheduleInput = { enabled: false };
        const mockResult = { id: 'sched-123', enabled: false };
        mockWorkflowService.updateWorkflowSchedule.mockResolvedValue(mockResult);

        const result = await resolver.updateWorkflowSchedule({}, { scheduleId: 'sched-123', updates }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.updateWorkflowSchedule).toHaveBeenCalledWith('sched-123', updates);
      });
    });

    describe('deleteWorkflowSchedule', () => {
      it('should delete a schedule', async () => {
        const mockResult = { success: true, message: 'Deleted' };
        mockWorkflowService.deleteWorkflowSchedule.mockResolvedValue(mockResult);

        const result = await resolver.deleteWorkflowSchedule({}, { scheduleId: 'sched-123' }, mockContext);

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.deleteWorkflowSchedule).toHaveBeenCalledWith('sched-123');
      });
    });
  });

  describe('Property Resolvers', () => {
    describe('workflowSchedules (RegisteredWorkflow)', () => {
      it('should return schedules for a workflow', async () => {
        const obj = { nameSpace: 'core', name: 'TestWorkflow', version: '1.0.0' };
        const mockSchedules = [{ id: 'sched-1', enabled: true }];
        mockWorkflowService.getWorkflowSchedulesForWorkflowId.mockResolvedValue(mockSchedules);

        const result = await resolver.workflowSchedules(obj, {}, mockContext);

        expect(result).toEqual(mockSchedules);
        expect(mockWorkflowService.getWorkflowSchedulesForWorkflowId).toHaveBeenCalledWith('core.TestWorkflow@1.0.0');
      });

      it('should return empty array if no schedules', async () => {
        const obj = { nameSpace: 'core', name: 'TestWorkflow', version: '1.0.0' };
        mockWorkflowService.getWorkflowSchedulesForWorkflowId.mockResolvedValue([]);

        const result = await resolver.workflowSchedules(obj, {}, mockContext);

        expect(result).toEqual([]);
      });
    });


    describe('workflowExecutionHistory (RegisteredWorkflow)', () => {
      it('should return recent execution history for a workflow', async () => {
        const obj = { id: 'core.TestWorkflow@1.0.0' };
        const mockHistory = [
          { id: 'exec-1', status: 2, createTime: new Date() },
          { id: 'exec-2', status: 2, createTime: new Date() }
        ];
        mockWorkflowService.getWorkflowHistoryByDefinitionId.mockResolvedValue({
          instances: mockHistory,
          pagination: { page: 1, pages: 1, limit: 10, total: 2 }
        });

        const result = await resolver.workflowExecutionHistory(obj, {}, mockContext);

        expect(result).toEqual(mockHistory);
        expect(mockWorkflowService.getWorkflowHistoryByDefinitionId).toHaveBeenCalledWith(
          'core.TestWorkflow@1.0.0',
          expect.objectContaining({ page: 1, limit: 10 })
        );
      });

      it('should return empty array on error', async () => {
        const obj = { nameSpace: 'core', name: 'TestWorkflow', version: '1.0.0' };
        mockWorkflowService.getWorkflowHistoryByDefinitionId.mockRejectedValue(new Error('DB Error'));

        const result = await resolver.workflowExecutionHistory(obj, {}, mockContext);

        expect(result).toEqual([]);
        expect(mockContext.log).toHaveBeenCalledWith(
          'Error fetching execution history for workflow',
          expect.any(Object),
          'error',
          'WorkflowResolver'
        );
      });
    });
  });

  describe('Workflow Execution History Queries', () => {
    describe('getWorkflowExecutionHistory', () => {
      it('should return paginated execution history', async () => {
        const mockResult = {
          instances: [
            { id: 'exec-1', workflowDefinitionId: 'core.Test@1.0.0', status: 2 }
          ],
          pagination: { page: 1, pages: 1, limit: 10, total: 1 }
        };
        mockWorkflowService.getWorkflowHistory.mockResolvedValue(mockResult);

        const result = await resolver.getWorkflowExecutionHistory(
          {},
          { filter: { workflowDefinitionId: 'core.Test@1.0.0' }, pagination: { page: 1, limit: 10 } },
          mockContext
        );

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.getWorkflowHistory).toHaveBeenCalledWith(
          { workflowDefinitionId: 'core.Test@1.0.0' },
          { page: 1, limit: 10 }
        );
      });
    });

    describe('getWorkflowExecutionHistoryById', () => {
      it('should return specific execution by ID', async () => {
        const mockExecution = {
          id: 'exec-123',
          workflowDefinitionId: 'core.Test@1.0.0',
          status: 2,
          createTime: new Date()
        };
        mockWorkflowService.getWorkflowHistoryById.mockResolvedValue(mockExecution);

        const result = await resolver.getWorkflowExecutionHistoryById(
          {},
          { instanceId: 'exec-123' },
          mockContext
        );

        expect(result).toEqual(mockExecution);
        expect(mockWorkflowService.getWorkflowHistoryById).toHaveBeenCalledWith('exec-123');
      });
    });

    describe('getWorkflowExecutionStats', () => {
      it('should return execution statistics', async () => {
        const mockStats = {
          total: 100,
          pending: 5,
          runnable: 10,
          complete: 75,
          terminated: 10,
          suspended: 0,
          byWorkflowDefinition: []
        };
        mockWorkflowService.getWorkflowExecutionStats.mockResolvedValue(mockStats);

        const result = await resolver.getWorkflowExecutionStats({}, {}, mockContext);

        expect(result).toEqual(mockStats);
        expect(mockWorkflowService.getWorkflowExecutionStats).toHaveBeenCalled();
      });
    });

    describe('getRecentWorkflowExecutions', () => {
      it('should return recent executions with default limit', async () => {
        const mockRecent = [
          { id: 'exec-1', workflowDefinitionId: 'core.Test@1.0.0' }
        ];
        mockWorkflowService.getRecentWorkflowExecutions.mockResolvedValue(mockRecent);

        const result = await resolver.getRecentWorkflowExecutions({}, {}, mockContext);

        expect(result).toEqual(mockRecent);
        expect(mockWorkflowService.getRecentWorkflowExecutions).toHaveBeenCalledWith(10);
      });

      it('should respect custom limit', async () => {
        mockWorkflowService.getRecentWorkflowExecutions.mockResolvedValue([]);

        await resolver.getRecentWorkflowExecutions({}, { limit: 25 }, mockContext);

        expect(mockWorkflowService.getRecentWorkflowExecutions).toHaveBeenCalledWith(25);
      });
    });
  });

  describe('Workflow History Management Mutations', () => {
    describe('deleteWorkflowExecutionHistory', () => {
      it('should delete a single execution history item', async () => {
        const mockResult = {
          success: true,
          message: 'Successfully deleted workflow execution history',
          data: { deletedCount: 1 }
        };
        mockWorkflowService.deleteWorkflowHistory.mockResolvedValue(mockResult);

        const result = await resolver.deleteWorkflowExecutionHistory(
          {},
          { instanceId: 'exec-123' },
          mockContext
        );

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.deleteWorkflowHistory).toHaveBeenCalledWith('exec-123');
      });

      it('should return failure when instance not found', async () => {
        const mockResult = {
          success: false,
          message: 'Execution history not found',
          data: { deletedCount: 0 }
        };
        mockWorkflowService.deleteWorkflowHistory.mockResolvedValue(mockResult);

        const result = await resolver.deleteWorkflowExecutionHistory(
          {},
          { instanceId: 'non-existent' },
          mockContext
        );

        expect(result.success).toBe(false);
      });
    });

    describe('deleteWorkflowExecutionHistoryBatch', () => {
      it('should delete multiple execution history items', async () => {
        const mockResult = {
          success: true,
          message: 'Successfully deleted 5 workflow execution history items',
          data: { deletedCount: 5 }
        };
        mockWorkflowService.deleteWorkflowHistoryBatch.mockResolvedValue(mockResult);

        const instanceIds = ['exec-1', 'exec-2', 'exec-3', 'exec-4', 'exec-5'];
        const result = await resolver.deleteWorkflowExecutionHistoryBatch(
          {},
          { instanceIds },
          mockContext
        );

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.deleteWorkflowHistoryBatch).toHaveBeenCalledWith(instanceIds);
      });

      it('should handle empty array', async () => {
        const mockResult = {
          success: false,
          message: 'No instance IDs provided',
          data: { deletedCount: 0 }
        };
        mockWorkflowService.deleteWorkflowHistoryBatch.mockResolvedValue(mockResult);

        const result = await resolver.deleteWorkflowExecutionHistoryBatch(
          {},
          { instanceIds: [] },
          mockContext
        );

        expect(result.success).toBe(false);
      });
    });

    describe('clearWorkflowExecutionHistory', () => {
      it('should clear all history for a workflow definition', async () => {
        const mockResult = {
          success: true,
          message: 'Successfully cleared 100 workflow execution history items for core.CleanCacheWorkflow@1.0.0',
          data: { deletedCount: 100 }
        };
        mockWorkflowService.clearWorkflowHistory.mockResolvedValue(mockResult);

        const result = await resolver.clearWorkflowExecutionHistory(
          {},
          { workflowDefinitionId: 'core.CleanCacheWorkflow@1.0.0' },
          mockContext
        );

        expect(result).toEqual(mockResult);
        expect(mockWorkflowService.clearWorkflowHistory).toHaveBeenCalledWith('core.CleanCacheWorkflow@1.0.0');
      });

      it('should handle case when no history exists', async () => {
        const mockResult = {
          success: true,
          message: 'No execution history found to clear',
          data: { deletedCount: 0 }
        };
        mockWorkflowService.clearWorkflowHistory.mockResolvedValue(mockResult);

        const result = await resolver.clearWorkflowExecutionHistory(
          {},
          { workflowDefinitionId: 'core.NonExistent@1.0.0' },
          mockContext
        );

        expect(result.success).toBe(true);
        expect(result.data?.deletedCount).toBe(0);
      });

      it('should handle errors gracefully', async () => {
        const mockResult = {
          success: false,
          message: 'Failed to clear workflow execution history: Permission denied'
        };
        mockWorkflowService.clearWorkflowHistory.mockResolvedValue(mockResult);

        const result = await resolver.clearWorkflowExecutionHistory(
          {},
          { workflowDefinitionId: 'core.Test@1.0.0' },
          mockContext
        );

        expect(result.success).toBe(false);
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // REACTORY-302016408 — termination reason / lastActivity / salvage surface
  //
  // This is new public API, and the enum mapping is exactly where a silent
  // production bug would land: one wrong token downgrades a real cause to
  // UNKNOWN, or nulls the whole field. The mappings are therefore table-driven
  // and exhaustive rather than spot-checked.
  // ════════════════════════════════════════════════════════════════════════════
  describe('termination reason surface (REACTORY-302016408)', () => {
    const reason = (overrides: any = {}) => ({
      code: 'provider-error',
      message: 'Dead-lettered (retries-exhausted): 503 Service Unavailable',
      time: '2026-11-03T08:22:35.000Z',
      source: 'dead-letter',
      recorded: true,
      ...overrides,
    });

    describe('WorkflowInstance property resolvers', () => {
      it('maps every persisted termination code to its GraphQL enum member', () => {
        const cases: Array<[string, string]> = [
          ['crash', 'CRASH'],
          ['oom', 'OOM'],
          ['cancelled', 'CANCELLED'],
          ['timeout', 'TIMEOUT'],
          ['provider-error', 'PROVIDER_ERROR'],
          ['shutdown', 'SHUTDOWN'],
          ['unknown', 'UNKNOWN'],
        ];

        for (const [code, expected] of cases) {
          const resolved = resolver.instanceTerminationReason({ terminationReason: reason({ code }) });
          expect([code, resolved.code]).toEqual([code, expected]);
        }
      });

      it('maps every termination source to its GraphQL enum member', () => {
        const cases: Array<[string, string]> = [
          ['cancel', 'CANCEL'],
          ['timeout', 'TIMEOUT'],
          ['dead-letter', 'DEAD_LETTER'],
          ['provider', 'PROVIDER'],
          ['step', 'STEP'],
          ['process', 'PROCESS'],
          ['shutdown', 'SHUTDOWN'],
          ['owner', 'OWNER'],
          ['derived', 'DERIVED'],
        ];

        for (const [source, expected] of cases) {
          const resolved = resolver.instanceTerminationReason({ terminationReason: reason({ source }) });
          expect([source, resolved.source]).toEqual([source, expected]);
        }
      });

      it('degrades an unrecognised token to UNKNOWN / DERIVED without throwing', () => {
        const resolved = resolver.instanceTerminationReason({
          terminationReason: reason({ code: 'brand-new-cause', source: 'brand-new-source' }),
        });

        // A future engine code must never null the field or crash the query.
        expect(resolved.code).toBe('UNKNOWN');
        expect(resolved.source).toBe('DERIVED');
        expect(resolved.message).toBe(reason().message);
      });

      it('keeps a COMPLETE row null (no reason is not an error)', () => {
        expect(resolver.instanceTerminationReason({ terminationReason: null })).toBeNull();
        expect(resolver.instanceTerminationReason({})).toBeNull();
        expect(resolver.instanceTerminationReason(null)).toBeNull();
      });

      it('reports recorded:false for a synthesised reason and true for a recorded one', () => {
        expect(resolver.instanceTerminationReason({
          terminationReason: reason({ code: 'unknown', source: 'derived', recorded: false }),
        }).recorded).toBe(false);
        expect(resolver.instanceTerminationReason({ terminationReason: reason() }).recorded).toBe(true);
      });

      it('resolves lastActivity, tolerating absence', () => {
        const when = new Date('2026-11-03T10:53:00.000Z');
        expect(resolver.instanceLastActivity({ lastActivity: when })).toBe(when);
        expect(resolver.instanceLastActivity({})).toBeNull();
        expect(resolver.instanceLastActivity(null)).toBeNull();
      });

      it('derives `unresolved` from the salvage record', () => {
        const base = {
          required: true,
          worktreePath: '/tmp/wt',
          branch: 'bug/REACTORY-302016408',
          headSha: '4856720',
          dirty: true,
          changedFileCount: 15,
          message: 'terminated before publish',
          recordedAt: '2026-11-03T11:00:00.000Z',
        };

        expect(resolver.instanceSalvage({ salvage: base }).unresolved).toBe(true);
        expect(resolver.instanceSalvage({ salvage: { ...base, acknowledgedAt: '2026-11-03T12:00:00.000Z' } }).unresolved).toBe(false);
        expect(resolver.instanceSalvage({ salvage: { ...base, salvageSha: '4856720' } }).unresolved).toBe(false);
        expect(resolver.instanceSalvage({ salvage: { ...base, publishedSha: 'deadbeef' } }).unresolved).toBe(false);
        // A record that is not required never blocks, even with no resolution.
        expect(resolver.instanceSalvage({ salvage: { ...base, required: false } }).unresolved).toBe(false);
        expect(resolver.instanceSalvage({})).toBeNull();
      });

      it('passes salvage fields through, filling absent optional values with null', () => {
        const resolved = resolver.instanceSalvage({
          salvage: { required: true, worktreePath: '/tmp/wt', recordedAt: '2026-11-03T11:00:00.000Z' },
        });

        expect(resolved.worktreePath).toBe('/tmp/wt');
        expect(resolved.branch).toBeNull();
        expect(resolved.salvageSha).toBeNull();
        expect(resolved.publishedSha).toBeNull();
        expect(resolved.acknowledgedAt).toBeNull();
      });
    });

    describe('WorkflowExecutionHistory property resolvers', () => {
      it('maps the history row the same way as the instance', () => {
        const withCode = resolver.historyTerminationReason({ terminationReason: reason({ code: 'oom' }) });
        expect(withCode.code).toBe('OOM');
        expect(withCode.source).toBe('DEAD_LETTER');

        expect(resolver.historyTerminationReason({ terminationReason: null })).toBeNull();
      });

      it('resolves lastActivity and salvage on the history row', () => {
        const when = new Date('2026-11-03T10:53:00.000Z');
        expect(resolver.historyLastActivity({ lastActivity: when })).toBe(when);
        expect(resolver.historyLastActivity({})).toBeNull();

        expect(resolver.historySalvage({
          salvage: { required: true, worktreePath: '/tmp/wt', recordedAt: '2026-11-03T11:00:00.000Z' },
        }).unresolved).toBe(true);
        expect(resolver.historySalvage({})).toBeNull();
      });
    });

    describe('cancel with a reason', () => {
      it('forwards the operator reason as a two-argument call', async () => {
        mockWorkflowService.cancelWorkflowInstance.mockResolvedValue({ success: true } as any);

        await resolver.cancelWorkflowInstance(
          {},
          { instanceId: 'inst-123', reason: 'runaway agent step' },
          mockContext,
        );

        expect(mockWorkflowService.cancelWorkflowInstance)
          .toHaveBeenCalledWith('inst-123', 'runaway agent step');
      });

      it('keeps the one-argument call when no reason is supplied', async () => {
        mockWorkflowService.cancelWorkflowInstance.mockResolvedValue({ success: true } as any);

        await resolver.cancelWorkflowInstance({}, { instanceId: 'inst-123' }, mockContext);

        expect(mockWorkflowService.cancelWorkflowInstance).toHaveBeenCalledWith('inst-123');
      });
    });

    describe('recordWorkflowInstanceSalvage', () => {
      it('records the worktree facts through the service', async () => {
        mockWorkflowService.recordWorkflowSalvage = jest.fn().mockResolvedValue({
          success: true,
          message: 'Recorded salvage for instance inst-123',
          data: { worktreePath: '/tmp/wt' },
        });

        const result = await resolver.recordWorkflowInstanceSalvage(
          {},
          {
            instanceId: 'inst-123',
            input: {
              worktreePath: '/tmp/wt',
              branch: 'bug/REACTORY-302016408-20261103-4082245933',
              headSha: '4856720',
              dirty: true,
              changedFileCount: 15,
            },
          },
          mockContext,
        );

        expect(result.success).toBe(true);
        expect(mockWorkflowService.recordWorkflowSalvage).toHaveBeenCalledWith('inst-123', {
          worktreePath: '/tmp/wt',
          branch: 'bug/REACTORY-302016408-20261103-4082245933',
          headSha: '4856720',
          dirty: true,
          changedFileCount: 15,
        });
      });

      it('returns a failure result (not a throw) when the service rejects', async () => {
        mockWorkflowService.recordWorkflowSalvage = jest.fn().mockRejectedValue(new Error('instance not found'));

        const result = await resolver.recordWorkflowInstanceSalvage(
          {},
          { instanceId: 'inst-404', input: { worktreePath: '/tmp/wt' } },
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('instance not found');
        expect(mockContext.log).toHaveBeenCalled();
      });

      it('tolerates a missing input object', async () => {
        mockWorkflowService.recordWorkflowSalvage = jest.fn().mockResolvedValue({ success: true });

        await resolver.recordWorkflowInstanceSalvage({}, { instanceId: 'inst-123' } as any, mockContext);

        expect(mockWorkflowService.recordWorkflowSalvage).toHaveBeenCalledWith('inst-123', {});
      });
    });

    describe('acknowledgeWorkflowInstanceSalvage', () => {
      it('resolves the record with the commit SHA and the caller identity', async () => {
        mockWorkflowService.acknowledgeWorkflowSalvage = jest.fn().mockResolvedValue({
          success: true,
          message: 'Salvage acknowledged for instance inst-123',
          data: { salvageSha: '4856720' },
        });

        const operator = { ...mockContext, user: { id: 'u-1', email: 'operator@reactory.net', roles: ['WORKFLOW_ADMIN'] } };

        const result = await resolver.acknowledgeWorkflowInstanceSalvage(
          {},
          { instanceId: 'inst-123', salvageSha: '4856720', note: 'recovered onto the ticket branch' },
          operator as any,
        );

        expect(result.success).toBe(true);
        // The actor is recorded: an acknowledgement is a human decision and the
        // history must say who took it.
        expect(mockWorkflowService.acknowledgeWorkflowSalvage).toHaveBeenCalledWith('inst-123', {
          acknowledgedBy: 'operator@reactory.net',
          note: 'recovered onto the ticket branch',
          salvageSha: '4856720',
          publishedSha: undefined,
        });
      });

      it('defaults the actor when the context carries no user', async () => {
        mockWorkflowService.acknowledgeWorkflowSalvage = jest.fn().mockResolvedValue({ success: true });
        const anonymousContext = { ...mockContext, user: undefined };

        await resolver.acknowledgeWorkflowInstanceSalvage(
          {},
          { instanceId: 'inst-123' },
          anonymousContext as any,
        );

        expect(mockWorkflowService.acknowledgeWorkflowSalvage)
          .toHaveBeenCalledWith('inst-123', expect.objectContaining({ acknowledgedBy: 'unknown' }));
      });

      it('returns a failure result (not a throw) when the service rejects', async () => {
        mockWorkflowService.acknowledgeWorkflowSalvage = jest.fn().mockRejectedValue(new Error('no salvage record'));

        const result = await resolver.acknowledgeWorkflowInstanceSalvage(
          {},
          { instanceId: 'inst-123' },
          mockContext,
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('no salvage record');
      });
    });
  });
});
