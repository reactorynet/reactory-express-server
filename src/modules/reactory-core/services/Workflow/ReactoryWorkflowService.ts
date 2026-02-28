import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators';
import { 
  WorkflowRunner,  
} from 'modules/reactory-core/workflow/WorkflowRunner/WorkflowRunner';
import { 
  IReactoryWorkflowService,
  IWorkflowSystemStatus,
  IWorkflowExecutionInput,
  IScheduleConfigInput,
  IUpdateScheduleInput,
  IWorkflowFilterInput,
  IInstanceFilterInput,
  IAuditFilterInput,
  IPaginationInput,
  IWorkflowOperationResult,  
  IWorkflowErrorStats,
  IWorkflowMetrics,
  IWorkflowConfigurationResponse,
  IPaginatedWorkflows,
  IWorkflowRegistryResponse,
  RegisteredWorkflow,
  IPaginatedInstances,
  IPaginatedSchedules,
  IFilteredSchedulesResponse,
  IPaginatedAuditLogs,
  IWorkflowStatusResponse,
  IWorkflowHistoryFilter,
  IWorkflowHistoryPagination,
  IPaginatedWorkflowHistory,
  IWorkflowHistoryItem,
  IWorkflowExecutionStats,
  WorkflowESStatus,
} from './types';
import { IScheduleConfig } from '@reactory/server-modules/reactory-core/workflow/Scheduler/Scheduler';
import { IWorkflowInstance, IWorkflowLifecycleStats } from '@reactory/server-modules/reactory-core/workflow/LifecycleManager/LifecycleManager';
import { IConfigurationStats } from '@reactory/server-modules/reactory-core/workflow/ConfigurationManager/ConfigurationManager';
import { ISecurityStats } from '@reactory/server-modules/reactory-core/workflow/SecurityManager/SecurityManager';
import { IScheduledWorkflow, ISchedulerStats } from 'modules/reactory-core/workflow/Scheduler/Scheduler';

@service({
  name: "ReactoryWorkflowService",
  nameSpace: "core",
  version: "1.0.0",
  description: "Service for managing workflows in Reactory",
  id: "core.ReactoryWorkflowService@1.0.0",
  serviceType: "workflow",
  dependencies: []
})
class ReactoryWorkflowService implements IReactoryWorkflowService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.Server.IReactoryContext;
  props: any;
  workflowRunner: WorkflowRunner;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;    
  }

  async onStartup(): Promise<any> {
    if(!this.workflowRunner) {
      this.workflowRunner = WorkflowRunner.getInstance({}, this.context);
    }
    if (!this.workflowRunner.isInitialized()) {      
      await this.workflowRunner.initialize();
    }
    this.context.log(`Workflow service startup ${this.context.colors.green('STARTUP OKAY')} ✅`);
    return true;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  // Helper method to get WorkflowRunner instance
  private async getWorkflowRunner(): Promise<WorkflowRunner> {
    if (!this.workflowRunner) {
      this.workflowRunner = WorkflowRunner.getInstance({}, this.context);
    }
    if (!this.workflowRunner.isInitialized()) {
      await this.workflowRunner.initialize();
    }
    return this.workflowRunner;
  }

  // System Status & Health
  async getSystemStatus(): Promise<IWorkflowSystemStatus> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      
      // Get data from WorkflowRunner singleton
      const lifecycleStats: IWorkflowLifecycleStats = workflowRunner
        ?.getLifecycleManager()
        ?.getStats() || {
          pausedWorkflows: 0,
          runningWorkflows: 0,
          completedWorkflows: 0,
          failedWorkflows: 0,
          cancelledWorkflows: 0,
          totalWorkflows: 0,
          averageExecutionTime: 0,
          lastCleanupTime: new Date(),
          resourceUtilization: {
            memory: 0,
            cpu: 0,
            disk: 0
          }
      };

      const errorStats: Map<string, IWorkflowErrorStats> =  workflowRunner.getAllErrorStats();
      const configStats: IConfigurationStats = workflowRunner.getConfigurationStats();
      const securityStats: ISecurityStats = workflowRunner.getSecurityStats();

      return {
        system: {
          initialized: workflowRunner?.isInitialized() || false,
          status: workflowRunner?.isInitialized() ? 'HEALTHY' : 'INITIALIZING',
          timestamp: new Date()
        },
        lifecycle: lifecycleStats,
        errors: errorStats,
        configuration: configStats,
        security: securityStats
      };
    } catch (error) {
      this.context.log('Error getting system status', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowMetrics(): Promise<IWorkflowMetrics> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const systemStatus = await this.getSystemStatus();
      
      const schedulerStats: ISchedulerStats = workflowRunner?.getScheduler()?.getStats() || {
        activeSchedules: 0,
        totalSchedules: 0,
        totalRuns: 0,
        totalErrors: 0,
      };

      return {
        lifecycle: systemStatus.lifecycle,
        scheduler: schedulerStats,
        errors: systemStatus.errors,
        configuration: systemStatus.configuration,
        security: systemStatus.security
      };
    } catch (error) {
      this.context.log('Error getting workflow metrics', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowConfigurations(): Promise<IWorkflowConfigurationResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const configManager = workflowRunner?.getConfigurationManager();
      
      const configurations = configManager?.getAllConfigurations() || {};
      
      // Validate all configurations
      const errors: any[] = [];
      const warnings: any[] = [];
      let isValid = true;
      
      for (const [key, config] of Object.entries(configurations)) {
        const validation = configManager?.validateConfiguration(config as any);
        if (validation && !validation.isValid) {
          isValid = false;
          if (validation.errors) {
            errors.push(...validation.errors.map((e: any) => ({ ...e, configKey: key })));
          }
        }
        if (validation?.warnings) {
          warnings.push(...validation.warnings.map((w: any) => ({ ...w, configKey: key })));
        }
      }

      return {
        configurations,
        validation: {
          isValid,
          errors,
          warnings
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow configurations', { error }, 'error');
      throw error;
    }
  }

  // Workflow Registry
  async getWorkflows(filter?: IWorkflowFilterInput, pagination?: IPaginationInput): Promise<IPaginatedWorkflows> {
    try {
      const workflowRunner = await this.getWorkflowRunner();

      // Get registered workflows from WorkflowRunner
      const allWorkflows = await workflowRunner?.getRegisteredWorkflows() as any as RegisteredWorkflow[] || [];

      // Get execution stats from MongoDB
      const executionStats = await this.getWorkflowExecutionStats();

      // Get scheduler and lifecycle manager for active status
      const scheduler = workflowRunner?.getScheduler();
      const lifecycleManager = workflowRunner?.getLifecycleManager();

      // Get counts of non-terminated instances with failed execution pointers
      // This captures step-level failures that workflow-es hasn't marked as TERMINATED
      const failedStepCounts = await lifecycleManager?.getInstancesWithFailedSteps() || {};

      // Enrich workflows with execution stats and active status
      const enrichedWorkflows = await Promise.all(allWorkflows.map(async (workflow: any) => {
        const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

        // Get execution statistics from MongoDB
        const stats = executionStats.byWorkflowDefinition.find(
          s => s.workflowDefinitionId === workflowId
        );

        const totalExecutions = stats?.total || 0;
        const successfulExecutions = stats?.complete || 0;
        // Count both terminated workflows AND non-terminated instances with failed steps
        const terminatedCount = stats?.terminated || 0;
        const failedStepInstanceCount = failedStepCounts[workflowId] || 0;
        const failedExecutions = terminatedCount + failedStepInstanceCount;

        // Determine active status based on schedules and running instances
        let isActive = false;
        let hasSchedule = false;

        // Check if workflow has active schedules
        const schedules = scheduler?.getSchedulesForWorkflow(workflowId) || [];
        if (schedules.length > 0) {
          hasSchedule = true;
          // Check if any schedule is enabled
          isActive = schedules.some((schedule: any) => schedule.config?.schedule?.enabled === true);
        }

        // Check if workflow has running instances
        if (!isActive) {
          const instances = lifecycleManager?.getInstancesByWorkflowId(workflowId) || [];
          const runningInstances = instances.filter((instance: any) =>
            instance.status === 'RUNNING' || instance.status === 'running'
          );
          if (runningInstances.length > 0) {
            isActive = true;
          }
        }

        return {
          ...workflow,
          isActive,
          hasSchedule,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          statistics: {
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageExecutionTime: executionStats.averageCompletionTime || 0
          }
        };
      }));

      // Apply filters
      let filteredWorkflows = enrichedWorkflows;
      if (filter) {
        filteredWorkflows = enrichedWorkflows.filter((workflow: any) => {
          // Filter by searchString (searches across multiple fields)
          if (filter.searchString) {
            const searchLower = filter.searchString.toLowerCase().trim();
            const matchesSearch =
              workflow.name?.toLowerCase().includes(searchLower) ||
              workflow.nameSpace?.toLowerCase().includes(searchLower) ||
              workflow.description?.toLowerCase().includes(searchLower) ||
              workflow.version?.toLowerCase().includes(searchLower) ||
              workflow.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
              workflow.author?.toLowerCase().includes(searchLower) ||
              `${workflow.nameSpace}.${workflow.name}@${workflow.version}`.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;
          }

          // Filter by specific fields
          if (filter.nameSpace && workflow.nameSpace !== filter.nameSpace) return false;
          if (filter.name && workflow.name !== filter.name) return false;
          if (filter.version && workflow.version !== filter.version) return false;
          if (filter.isActive !== undefined && workflow.isActive !== filter.isActive) return false;
          if (filter.tags && !filter.tags.some((tag: string) => workflow.tags?.includes(tag))) return false;
          if (filter.author && workflow.author !== filter.author) return false;

          // Filter by IDs array
          if (filter.ids && filter.ids.length > 0) {
            const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
            if (!filter.ids.includes(workflowId)) return false;
          }

          // Filter by hasSchedule
          if (filter.hasSchedule !== undefined && workflow.hasSchedule !== filter.hasSchedule) return false;

          // Filter by hasErrors (workflows with failed executions)
          if (filter.hasErrors !== undefined) {
            const hasErrors = (workflow.statistics?.failedExecutions || 0) > 0;
            if (hasErrors !== filter.hasErrors) return false;
          }

          // Filter by neverRun (workflows with no executions)
          if (filter.neverRun !== undefined) {
            const neverRun = (workflow.statistics?.totalExecutions || 0) === 0;
            if (neverRun !== filter.neverRun) return false;
          }

          // Filter by recentlyUpdated (workflows updated in last 24 hours)
          if (filter.recentlyUpdated !== undefined) {
            let recentlyUpdated = false;
            if (workflow.updatedAt) {
              const dayAgo = new Date();
              dayAgo.setDate(dayAgo.getDate() - 1);
              recentlyUpdated = new Date(workflow.updatedAt) > dayAgo;
            }
            if (recentlyUpdated !== filter.recentlyUpdated) return false;
          }

          return true;
        });
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);
      const total = filteredWorkflows.length;
      const pages = Math.ceil(total / limit);

      return {
        workflows: paginatedWorkflows,
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log('Error getting workflows', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowRegistry(): Promise<IWorkflowRegistryResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const allWorkflows = workflowRunner?.getRegisteredWorkflows() as any as  RegisteredWorkflow[] || [];
      
      const stats = {
        totalWorkflows: allWorkflows.length,
        activeWorkflows: allWorkflows.filter((w: any) => w.isActive).length,
        inactiveWorkflows: allWorkflows.filter((w: any) => !w.isActive).length,
        nameSpaces: [...new Set(allWorkflows.map((w: any) => w.nameSpace))],
        versions: allWorkflows.reduce((acc: any, w: any) => {
          if (!acc[`${w.nameSpace}.${w.name}`]) acc[`${w.nameSpace}.${w.name}`] = [];
          acc[`${w.nameSpace}.${w.name}`].push(w.version);
          return acc;
        }, {}),
        lastRegistered: new Date(),
        registrationErrors: 0
      };

      return {
        workflows: allWorkflows,
        stats
      };
    } catch (error) {
      this.context.log('Error getting workflow registry', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowWithId(id: string): Promise<RegisteredWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const workflow = workflowRunner?.getWorkflowWithId(id) as any as RegisteredWorkflow;
      
      if (!workflow) {
        throw new Error(`Workflow with ID ${id} not found`);
      }

      // Get instances directly using the workflow ID
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      const workflowInstances = lifecycleManager?.getInstancesByWorkflowId(id) || [];
      
      const stats = {
        totalExecutions: workflowInstances.length,
        successfulExecutions: workflowInstances.filter((i: any) => i.status === 'COMPLETED' || i.status === 'completed').length,
        failedExecutions: workflowInstances.filter((i: any) => i.status === 'FAILED' || i.status === 'failed').length,
        averageExecutionTime: 0 // TODO: Calculate from instances
      };

      return {
        ...workflow,
        instances: workflowInstances,
        statistics: stats
      };
    } catch (error) {
      this.context.log('Error getting workflow by ID', { error }, 'error');
      throw error;
    }
  }

  async getWorkflow(nameSpace: string, name: string): Promise<RegisteredWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const workflow = workflowRunner?.getWorkflowByName(nameSpace, name) as any as RegisteredWorkflow;
      
      if (!workflow) {
        throw new Error(`Workflow ${nameSpace}.${name} not found`);
      }

      // Get additional details
      const instances = await this.getWorkflowInstances({ name: name, nameSpace });
      const stats = {
        totalExecutions: instances.instances?.length || 0,
        successfulExecutions: instances.instances?.filter((i: any) => i.status === 'COMPLETED')?.length || 0,
        failedExecutions: instances.instances?.filter((i: any) => i.status === 'FAILED')?.length || 0,
        averageExecutionTime: 0 // TODO: Calculate from instances
      };

      return {
        ...workflow,
        instances: instances.instances || [],
        statistics: stats
      };
    } catch (error) {
      this.context.log('Error getting workflow', { error }, 'error');
      throw error;
    }
  }

  // Workflow Instances
  async getWorkflowInstances(filter?: IInstanceFilterInput, pagination?: IPaginationInput): Promise<IPaginatedInstances> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      let instances: IWorkflowInstance[] = [];
      if (filter?.id) { 
        instances = await lifecycleManager?.getInstancesByWorkflowId(filter.id) || [];
      } else {
        instances = await lifecycleManager?.getAllWorkflowInstances() || [];
      }
      // Apply additional filters
      if (filter) {
        instances = instances.filter((instance: any) => {
          if (filter.name && instance.workflowName !== filter.name) return false; // Note: filter.name maps to workflowName
          if (filter.nameSpace && instance.nameSpace !== filter.nameSpace) return false;
          if (filter.status && instance.status !== filter.status) return false;
          if (filter.createdBy && instance.createdBy !== filter.createdBy) return false;
          if (filter.startTimeFrom && new Date(instance.startTime) < new Date(filter.startTimeFrom)) return false;
          if (filter.startTimeTo && new Date(instance.startTime) > new Date(filter.startTimeTo)) return false;
          return true;
        });
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedInstances = instances.slice(startIndex, endIndex);
      const total = instances.length;
      const pages = Math.ceil(total / limit);

      return {
        instances: paginatedInstances,
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow instances', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowInstance(instanceId: string): Promise<IWorkflowInstance> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const instance = await workflowRunner?.lifecycleManager.getWorkflowInstance(instanceId);
      
      if (!instance) {
        throw new Error(`Workflow instance ${instanceId} not found`);
      }

      return instance;
    } catch (error) {
      this.context.log('Error getting workflow instance', { error }, 'error');
      throw error;
    }
  }

  async startWorkflow(workflowId: string, input?: IWorkflowExecutionInput): Promise<IWorkflowInstance> {
    try {
      const workflowRunner = await this.getWorkflowRunner();

      // Parse workflow ID: format is "namespace.name@version"
      // Example: "core.CleanCacheWorkflow@1.0.0"
      const atIndex = workflowId.lastIndexOf('@');
      const version = atIndex > -1 ? workflowId.substring(atIndex + 1) : '1.0.0';
    
      // Pass the full workflow ID (with namespace) to the runner
      const instanceId = await workflowRunner?.startWorkflow(workflowId, version, input, this.context);
      const instance = await workflowRunner?.lifecycleManager.getWorkflowInstance(instanceId);
      // the object here does not have the full details of the instance, so we need to fetch it again from the lifecycle manager to get all the details including status, start time, etc.
      // get the regustered workflow 

      return instance;
    } catch (error) {
      this.context.log('Error starting workflow', { error, workflowId, input }, 'error');
      throw error;
    }
  }

  async pauseWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.pauseWorkflowInstance(instanceId);
      
      return {
        success: true,
        message: `Workflow instance ${instanceId} paused successfully`
      };
    } catch (error) {
      this.context.log('Error pausing workflow instance', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to pause workflow instance: ${error.message}`
      };
    }
  }

  async resumeWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.resumeWorkflowInstance(instanceId);
      
      return {
        success: true,
        message: `Workflow instance ${instanceId} resumed successfully`
      };
    } catch (error) {
      this.context.log('Error resuming workflow instance', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to resume workflow instance: ${error.message}`
      };
    }
  }

  async cancelWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.cancelWorkflowInstance(instanceId);
      
      return {
        success: true,
        message: `Workflow instance ${instanceId} cancelled successfully`
      };
    } catch (error) {
      this.context.log('Error cancelling workflow instance', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to cancel workflow instance: ${error.message}`
      };
    }
  }

  // ============================================
  // Workflow History (MongoDB Persistence)
  // ============================================

  /**
   * Get paginated workflow history from MongoDB
   * @param filter - Filter options for querying workflow history
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async getWorkflowHistory(
    filter?: IWorkflowHistoryFilter,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistory(filter, pagination);
    } catch (error) {
      this.context.log('Error getting workflow history', { error, filter, pagination }, 'error');
      throw error;
    }
  }

  /**
   * Get a single workflow history item by instance ID
   * @param instanceId - The workflow instance ID
   * @returns The workflow history item or null if not found
   */
  async getWorkflowHistoryById(instanceId: string): Promise<IWorkflowHistoryItem | null> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistoryById(instanceId);
    } catch (error) {
      this.context.log('Error getting workflow history by ID', { error, instanceId }, 'error');
      throw error;
    }
  }

  /**
   * Get workflow history by workflow definition ID
   * @param workflowDefinitionId - The workflow definition ID (e.g., 'core.CleanCacheWorkflow@1.0.0')
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async getWorkflowHistoryByDefinitionId(
    workflowDefinitionId: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistoryByDefinitionId(workflowDefinitionId, pagination);
    } catch (error) {
      this.context.log('Error getting workflow history by definition ID', { error, workflowDefinitionId }, 'error');
      throw error;
    }
  }

  /**
   * Get workflow history by status
   * @param status - The status or array of statuses to filter by
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async getWorkflowHistoryByStatus(
    status: WorkflowESStatus | WorkflowESStatus[],
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistoryByStatus(status, pagination);
    } catch (error) {
      this.context.log('Error getting workflow history by status', { error, status }, 'error');
      throw error;
    }
  }

  /**
   * Get workflow execution statistics from MongoDB
   * @returns Workflow execution statistics including counts by status and by workflow definition
   */
  async getWorkflowExecutionStats(): Promise<IWorkflowExecutionStats> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowExecutionStats();
    } catch (error) {
      this.context.log('Error getting workflow execution stats', { error }, 'error');
      throw error;
    }
  }

  /**
   * Search workflow history with text search
   * @param searchTerm - The search term to match against workflow definition ID, description, or instance ID
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async searchWorkflowHistory(
    searchTerm: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.searchWorkflowHistory(searchTerm, pagination);
    } catch (error) {
      this.context.log('Error searching workflow history', { error, searchTerm }, 'error');
      throw error;
    }
  }

  /**
   * Get recent workflow executions
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of recent workflow history items
   */
  async getRecentWorkflowExecutions(limit: number = 10): Promise<IWorkflowHistoryItem[]> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getRecentWorkflowExecutions(limit);
    } catch (error) {
      this.context.log('Error getting recent workflow executions', { error, limit }, 'error');
      throw error;
    }
  }

  // ============================================
  // Workflow History Management
  // ============================================

  /**
   * Delete a single workflow execution history item
   * @param instanceId - The workflow instance ID to delete
   * @returns Operation result
   */
  async deleteWorkflowHistory(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      const result = await lifecycleManager.deleteWorkflowHistory(instanceId);
      
      return {
        success: result.success,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      };
    } catch (error) {
      this.context.log('Error deleting workflow history', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to delete workflow history: ${error.message}`
      };
    }
  }

  /**
   * Delete multiple workflow execution history items
   * @param instanceIds - Array of workflow instance IDs to delete
   * @returns Operation result
   */
  async deleteWorkflowHistoryBatch(instanceIds: string[]): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      const result = await lifecycleManager.deleteWorkflowHistoryBatch(instanceIds);
      
      return {
        success: result.success,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      };
    } catch (error) {
      this.context.log('Error deleting workflow history batch', { error, instanceIds }, 'error');
      return {
        success: false,
        message: `Failed to delete workflow history batch: ${error.message}`
      };
    }
  }

  /**
   * Clear all workflow execution history for a specific workflow definition
   * @param workflowDefinitionId - The workflow definition ID
   * @returns Operation result
   */
  async clearWorkflowHistory(workflowDefinitionId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      const result = await lifecycleManager.clearWorkflowHistory(workflowDefinitionId);
      
      return {
        success: result.success,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      };
    } catch (error) {
      this.context.log('Error clearing workflow history', { error, workflowDefinitionId }, 'error');
      return {
        success: false,
        message: `Failed to clear workflow history: ${error.message}`
      };
    }
  }

  // Workflow Schedules
  async getWorkflowSchedules(pagination?: IPaginationInput): Promise<IPaginatedSchedules> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedules = Array.from(await scheduler?.getSchedules() || []).map((entry: any) => entry[1]);
      
      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedSchedules = schedules.slice(startIndex, endIndex);
      const total = schedules.length;
      const pages = Math.ceil(total / limit);

      return {
        schedules: paginatedSchedules,
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow schedules', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowSchedule(scheduleId: string): Promise<IScheduledWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedule = await scheduler?.getSchedule(scheduleId);
      
      if (!schedule) {
        throw new Error(`Workflow schedule ${scheduleId} not found`);
      }

      return schedule;
    } catch (error) {
      this.context.log('Error getting workflow schedule', { error }, 'error');
      throw error;
    }
  }

  /**
   * Flatten an IScheduledWorkflow into the shape expected by the WorkflowSchedule GraphQL type
   */
  private flattenScheduledWorkflow(scheduled: IScheduledWorkflow): any {
    return {
      ...scheduled.config,
      lastRun: scheduled.lastRun,
      nextRun: scheduled.nextRun,
      runCount: scheduled.runCount,
      errorCount: scheduled.errorCount,
      isRunning: scheduled.isRunning,
      enabled: scheduled.config.schedule?.enabled !== false,
    };
  }

  async createWorkflowSchedule(config: IScheduleConfigInput): Promise<any> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();

      if (!scheduler) {
        throw new Error('Workflow scheduler is not available');
      }

      // Build the full IScheduleConfig from the input
      const scheduleConfig: IScheduleConfig = {
        id: config.id || `${config.workflow.nameSpace || 'default'}.${config.workflow.id}`.toLowerCase().replace(/[^a-z0-9.]/g, '-'),
        name: config.name,
        description: config.description,
        workflow: {
          id: config.workflow.id,
          version: config.workflow.version || '1',
          nameSpace: config.workflow.nameSpace,
        },
        schedule: {
          cron: config.schedule.cron,
          timezone: config.schedule.timezone,
          enabled: config.schedule.enabled !== false,
        },
        properties: config.properties,
        propertiesFormId: config.propertiesFormId,
        retry: config.retry,
        timeout: config.timeout,
        maxConcurrent: config.maxConcurrent,
      };

      const newSchedule = await scheduler.createSchedule(scheduleConfig);
      return this.flattenScheduledWorkflow(newSchedule);
    } catch (error) {
      this.context.log('Error creating workflow schedule', { error, config }, 'error');
      throw error;
    }
  }

  async updateWorkflowSchedule(scheduleId: string, updates: IUpdateScheduleInput): Promise<any> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();

      if (!scheduler) {
        throw new Error('Workflow scheduler is not available');
      }

      // Build partial IScheduleConfig from the update input
      const configUpdates: Partial<IScheduleConfig> = {};
      if (updates.name !== undefined) configUpdates.name = updates.name;
      if (updates.description !== undefined) configUpdates.description = updates.description;
      if (updates.workflow) configUpdates.workflow = { id: updates.workflow.id, version: updates.workflow.version || '1', nameSpace: updates.workflow.nameSpace };
      if (updates.schedule) configUpdates.schedule = { cron: updates.schedule.cron, timezone: updates.schedule.timezone, enabled: updates.schedule.enabled };
      if (updates.properties !== undefined) configUpdates.properties = updates.properties;
      if (updates.propertiesFormId !== undefined) configUpdates.propertiesFormId = updates.propertiesFormId;
      if (updates.retry !== undefined) configUpdates.retry = updates.retry;
      if (updates.timeout !== undefined) configUpdates.timeout = updates.timeout;
      if (updates.maxConcurrent !== undefined) configUpdates.maxConcurrent = updates.maxConcurrent;

      const schedule = await scheduler.updateScheduleConfig(scheduleId, configUpdates);
      return this.flattenScheduledWorkflow(schedule);
    } catch (error) {
      this.context.log('Error updating workflow schedule', { error, scheduleId, updates }, 'error');
      throw error;
    }
  }

  async deleteWorkflowSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();

      if (!scheduler) {
        throw new Error('Workflow scheduler is not available');
      }

      await scheduler.removeSchedule(scheduleId);
      
      return {
        success: true,
        message: `Workflow schedule ${scheduleId} deleted successfully`
      };
    } catch (error) {
      this.context.log('Error deleting workflow schedule', { error, scheduleId }, 'error');
      return {
        success: false,
        message: `Failed to delete workflow schedule: ${error.message}`
      };
    }
  }

  async startSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      await scheduler?.startSchedule(scheduleId); // Corrected from resumeSchedule to startSchedule
      
      return {
        success: true,
        message: `Workflow schedule ${scheduleId} started successfully`
      };
    } catch (error) {
      this.context.log('Error starting workflow schedule', { error, scheduleId }, 'error');
      return {
        success: false,
        message: `Failed to start workflow schedule: ${error.message}`
      };
    }
  }

  async stopSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      await scheduler?.stopSchedule(scheduleId); // Corrected from pauseSchedule to stopSchedule
      
      return {
        success: true,
        message: `Workflow schedule ${scheduleId} stopped successfully`
      };
    } catch (error) {
      this.context.log('Error stopping workflow schedule', { error, scheduleId }, 'error');
      return {
        success: false,
        message: `Failed to stop workflow schedule: ${error.message}`
      };
    }
  }

  async reloadSchedules(): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      await scheduler?.reloadSchedules();
      
      return {
        success: true,
        message: 'Workflow schedules reloaded successfully'
      };
    } catch (error) {
      this.context.log('Error reloading workflow schedules', { error }, 'error');
      return {
        success: false,
        message: `Failed to reload workflow schedules: ${error.message}`
      };
    }
  }

  /**
   * Get all schedules for a specific workflow by its complete ID
   * Workflow IDs follow the pattern: "namespace.WorkflowName@version"
   * @param workflowId - The complete workflow ID (e.g., "core.CleanCacheWorkflow@1.0.0")
   * @returns Array of schedules for the specified workflow
   */
  async getWorkflowSchedulesForWorkflowId(workflowId: string): Promise<any[]> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedules = scheduler?.getSchedulesForWorkflow(workflowId) || [];
      
      this.context.log(
        `Retrieved ${schedules.length} schedules for workflow ${workflowId}`,
        { workflowId, count: schedules.length },
        'debug'
      );

      return schedules.map((schedule: IScheduledWorkflow) => {
        return {
          ...schedule.config,
          lastRun: schedule.lastRun,
          nextRun: schedule.nextRun,
          runCount: schedule.runCount,
          errorCount: schedule.errorCount,
          isRunning: schedule.isRunning,
          enabled: schedule.config.schedule?.enabled !== false,
        };
      }) || [];
    } catch (error) {
      this.context.log('Error getting schedules for workflow', { error, workflowId }, 'error');
      throw error;
    }
  }

  /**
   * Filter schedules by workflow properties (namespace, name, version)
   * This method parses workflow IDs and matches against the provided criteria
   * @param nameSpace - Optional namespace to filter by (e.g., "core")
   * @param name - Optional workflow name to filter by (e.g., "CleanCacheWorkflow")
   * @param version - Optional version to filter by (e.g., "1.0.0")
   * @param pagination - Optional pagination parameters
   * @returns Filtered schedules with pagination
   */
  async filterSchedulesByWorkflowProperties(
    nameSpace?: string,
    name?: string,
    version?: string,
    pagination?: IPaginationInput
  ): Promise<IFilteredSchedulesResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedules = scheduler?.filterSchedulesByWorkflowProperties(nameSpace, name, version) || [];
      
      // Apply pagination if provided
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedSchedules = Array.from(schedules).slice(startIndex, endIndex);
      const total = schedules.length;
      const pages = Math.ceil(total / limit);

      this.context.log(
        'Filtered schedules by workflow properties',
        { 
          nameSpace, 
          name, 
          version, 
          total,
          page,
          limit
        },
        'debug'
      );

      return {
        schedules: paginatedSchedules,
        filter: {
          nameSpace,
          name,
          version
        },
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log(
        'Error filtering schedules by workflow properties',
        { error, nameSpace, name, version },
        'error'
      );
      throw error;
    }
  }

  // Audit and Monitoring
  async getWorkflowAuditLog(filter?: IAuditFilterInput, pagination?: IPaginationInput): Promise<IPaginatedAuditLogs> {
    try {
      // This would typically query MongoDB for audit logs
      // For now, return empty structure
      const entries: any[] = [];
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      
      return {
        entries,
        pagination: {
          page,
          pages: 0,
          limit,
          total: 0
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow audit log', { error }, 'error');
      throw error;
    }
  }

  // Legacy Support
  async getWorkflowStatus(workflowId: string): Promise<IWorkflowStatusResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const workflow = workflowRunner?.getWorkflowWithId(workflowId);
            
      let status: IWorkflowStatusResponse = {
        status: 'INACTIVE',
        errors: workflow?.errors || [],
        statistics: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0
        },
        configuration: workflowRunner?.getConfiguration(workflowId, workflow.version),
        instances: workflowRunner?.getAllWorkflowInstances().filter((instance: IWorkflowInstance) => instance.workflowId === workflowId),
        dependencies: workflow.dependencies || [],
        schedules: await this.getWorkflowSchedulesForWorkflowId(workflowId) || []
      };

      // check the configuration for the workflow
      if (status.configuration && status.configuration.enabled === false) {
        status.status = 'INACTIVE';
      }

      if(status.schedules?.length && status.schedules?.length > 0) {
        let hasEnabledSchedules = false;
        status.schedules.forEach(async (schedule: IScheduleConfig) => {
          if (schedule.schedule.enabled) {
            hasEnabledSchedules = true;
          }          
        });
        if (!hasEnabledSchedules) {
          status.status = 'INACTIVE';
        }
      }
      return status;
    } catch (error) {
      this.context.log('Error getting workflow status', { error, name }, 'error');
      throw error;
    }
  }

  async startWorkflowLegacy(name: string, data: any): Promise<boolean> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.startWorkflow(name, '1.0.0', data.input || {}, this.context);
      return true;
    } catch (error) {
      this.context.log('Error starting workflow (legacy)', { error, name, data }, 'error');
      return false;
    }
  }

  /**
   * Get combined error information for a specific workflow definition.
   * Merges ErrorHandler in-memory stats with execution history step-level failures from MongoDB.
   * @param workflowId - The workflow definition ID (e.g., 'kb.CollectSystemDocsWorkflow@1.0.0')
   * @returns Array of error objects with message, code, and stack
   */
  async getWorkflowErrors(workflowId: string): Promise<Array<{ message: string; code: string; stack?: string }>> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const errors: Array<{ message: string; code: string; stack?: string }> = [];

      // 1. Get ErrorHandler in-memory stats (captures startWorkflow-level failures)
      const errorStats = workflowRunner?.getAllErrorStats();
      if (errorStats) {
        const stats = errorStats.get(workflowId);
        if (stats) {
          errors.push({
            message: stats.message || `${stats.errorType} error (${stats.count} occurrence(s))`,
            code: stats.errorType || 'UNKNOWN',
            stack: stats.stack,
          });
        }
      }

      // 2. Get execution history step-level failures from MongoDB
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      if (lifecycleManager) {
        const errorDetails = await lifecycleManager.getWorkflowErrorDetails(workflowId, 10);
        for (const detail of errorDetails) {
          for (const step of detail.failedSteps) {
            const errorMessage = step.persistenceData?.message 
              || step.persistenceData?.error?.message
              || `Step ${step.stepId} failed (${step.statusLabel})`;
            errors.push({
              message: `[Instance ${detail.instanceId}] ${errorMessage}`,
              code: `STEP_FAILED_${step.stepId}`,
              stack: step.persistenceData?.stack || step.persistenceData?.error?.stack,
            });
          }
        }
      }

      return errors;
    } catch (error) {
      this.context.log('Error getting workflow errors', { error, workflowId }, 'error');
      return [];
    }
  }
}


export default  ReactoryWorkflowService;
