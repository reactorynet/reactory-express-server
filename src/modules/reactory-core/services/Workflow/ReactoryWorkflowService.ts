import Reactory from '@reactory/reactory-core';
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
      
      const schedulerStats: ISchedulerStats = await workflowRunner?.getScheduler()?.getStats() || {
        activeSchedules: 0,
        inactiveSchedules: 0,
        totalSchedules: 0,
        scheduledExecutions: 0,
        executionsToday: 0,
        missedExecutions: 0,
        nextExecution: undefined,
        lastExecution: undefined,
        totalRuns: 0,
        totalErrors: 0,
        // averageExecutionDelay: 0 // Removed as it is not in ISchedulerStats
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
      
      const configurations = await configManager?.getAllConfigurations() || {};
      const validation = await configManager?.validateAllConfigurations() || {
        isValid: true,
        errors: [],
        warnings: []
      };

      return {
        configurations,
        validation
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
      
      // Apply filters
      let filteredWorkflows = allWorkflows;
      if (filter) {
        filteredWorkflows = allWorkflows.filter((workflow: any) => {
          if (filter.nameSpace && workflow.nameSpace !== filter.nameSpace) return false;
          if (filter.isActive !== undefined && workflow.isActive !== filter.isActive) return false;
          if (filter.tags && !filter.tags.some((tag: string) => workflow.tags?.includes(tag))) return false;
          if (filter.author && workflow.author !== filter.author) return false;
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
      const instance = await workflowRunner?.getWorkflowInstance(instanceId);
      
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
      const [nameSpace, nameVersion] = workflowId.split('.');
      const [name, version] = nameVersion.split('@');
      
      const instance = await workflowRunner?.startWorkflow(name, version || '1.0.0', input);

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

  async createWorkflowSchedule(config: IScheduleConfigInput): Promise<IScheduledWorkflow> {
    try {
      const workflowRunner = this.getWorkflowRunner();
      // @ts-ignore
      const scheduler = (await workflowRunner)?.getScheduler();
      
      const newSchedule = {
        ...config,
        createdBy: this.context.user?.id,
        createdAt: new Date()
      };

      // @ts-ignore
      await scheduler?.addSchedule(newSchedule);

      // @ts-ignore
      return scheduler?.getSchedule(config.id);
    } catch (error) {
      this.context.log('Error creating workflow schedule', { error, config }, 'error');
      throw error;
    }
  }

  async updateWorkflowSchedule(scheduleId: string, updates: IUpdateScheduleInput): Promise<IScheduledWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      
      // @ts-ignore
      const schedule = await scheduler?.updateSchedule(scheduleId, {
        ...updates,
        updatedAt: new Date()
      });

      return schedule;
    } catch (error) {
      this.context.log('Error updating workflow schedule', { error, scheduleId, updates }, 'error');
      throw error;
    }
  }

  async deleteWorkflowSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      // @ts-ignore
      await scheduler?.removeSchedule(scheduleId);
      
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
  async getWorkflowSchedulesForWorkflowId(workflowId: string): Promise<IScheduleConfig[]> {
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
        return schedule.config
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
      await workflowRunner?.startWorkflow(name, '1.0.0', data.input || {});
      return true;
    } catch (error) {
      this.context.log('Error starting workflow (legacy)', { error, name, data }, 'error');
      return false;
    }
  }
}


export default  ReactoryWorkflowService;
