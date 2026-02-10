import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import { 
  IReactoryWorkflowService,
  IWorkflowExecutionInput,
  IScheduleConfigInput,
  IUpdateScheduleInput,
  IWorkflowFilterInput,
  IInstanceFilterInput,
  IAuditFilterInput,
  IPaginationInput,
  IWorkflowHistoryFilter,
  IWorkflowHistoryPagination,
  WorkflowESStatus,
} from '../../services/Workflow/types';
// IScheduleConfig imported for future use in schedule-related resolvers
// import { IScheduleConfig } from 'modules/reactory-core/workflow/Scheduler/Scheduler';


const getWorkflowService = (context: Reactory.Server.IReactoryContext): IReactoryWorkflowService => {
  return context.getService("core.ReactoryWorkflowService@1.0.0") as IReactoryWorkflowService;
}

// @ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class WorkflowResolver {

  resolver: any;


  // System Status & Health Queries
  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowSystemStatus")
  async getSystemStatus(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    return workflowService.getSystemStatus();
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowMetrics") 
  async getWorkflowMetrics(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowMetrics();
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @query("workflowConfigurations")
  async getWorkflowConfigurations(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowConfigurations();
  }

  // Workflow Registry Queries
  @roles(["USER"], 'args.context')
  @query("workflows")
  async getWorkflows(
    obj: any,
    params: {
      filter?: IWorkflowFilterInput,
      pagination?: IPaginationInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflows(params.filter, params.pagination);
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowRegistry")
  async getWorkflowRegistry(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowRegistry();
  }

  @roles(["USER"], 'args.context')
  @query("workflow")
  async getWorkflow(
    obj: any,
    params: {
      namespace: string,
      name: string
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflow(params.namespace, params.name);
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowWithId")
  async getWorkflowWithId(
    obj: any,
    params: {
      id: string
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowWithId(params.id);
  }

  // Workflow Instance Queries
  @roles(["USER"], 'args.context')
  @query("workflowInstances")
  async getWorkflowInstances(
    obj: any,
    params: {
      filter?: IInstanceFilterInput,
      pagination?: IPaginationInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowInstances(params.filter, params.pagination);
  }

  @roles(["USER"], 'args.context')
  @query("workflowInstance")
  async getWorkflowInstance(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowInstance(params.id);
  }

  // Workflow Execution History Queries (MongoDB persistence)
  @roles(["USER"], 'args.context')
  @query("workflowExecutionHistory")
  async getWorkflowExecutionHistory(
    obj: any,
    params: {
      filter?: {
        workflowDefinitionId?: string;
        status?: number[];
        createdAfter?: Date;
        createdBefore?: Date;
        completedAfter?: Date;
        completedBefore?: Date;
        searchTerm?: string;
      };
      pagination?: {
        page?: number;
        limit?: number;
        sortField?: 'createTime' | 'completeTime' | 'workflowDefinitionId' | 'status';
        sortOrder?: 'ASC' | 'DESC';
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    
    // Map GraphQL filter to service filter
    const filter: IWorkflowHistoryFilter | undefined = params.filter ? {
      workflowDefinitionId: params.filter.workflowDefinitionId,
      status: params.filter.status?.map(s => s as WorkflowESStatus),
      createdAfter: params.filter.createdAfter,
      createdBefore: params.filter.createdBefore,
      completedAfter: params.filter.completedAfter,
      completedBefore: params.filter.completedBefore,
      searchTerm: params.filter.searchTerm,
    } : undefined;

    // Map GraphQL pagination to service pagination
    const pagination: IWorkflowHistoryPagination | undefined = params.pagination ? {
      page: params.pagination.page,
      limit: params.pagination.limit,
      sortField: params.pagination.sortField,
      sortOrder: params.pagination.sortOrder?.toLowerCase() as 'asc' | 'desc',
    } : undefined;

    return workflowService.getWorkflowHistory(filter, pagination);
  }

  @roles(["USER"], 'args.context')
  @query("workflowExecutionHistoryById")
  async getWorkflowExecutionHistoryById(
    obj: any,
    params: { instanceId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowHistoryById(params.instanceId);
  }

  @roles(["USER"], 'args.context')
  @query("workflowExecutionHistoryByDefinitionId")
  async getWorkflowExecutionHistoryByDefinitionId(
    obj: any,
    params: {
      workflowDefinitionId: string;
      pagination?: {
        page?: number;
        limit?: number;
        sortField?: 'createTime' | 'completeTime' | 'workflowDefinitionId' | 'status';
        sortOrder?: 'ASC' | 'DESC';
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    
    const pagination: IWorkflowHistoryPagination | undefined = params.pagination ? {
      page: params.pagination.page,
      limit: params.pagination.limit,
      sortField: params.pagination.sortField,
      sortOrder: params.pagination.sortOrder?.toLowerCase() as 'asc' | 'desc',
    } : undefined;

    return workflowService.getWorkflowHistoryByDefinitionId(params.workflowDefinitionId, pagination);
  }

  @roles(["USER"], 'args.context')
  @query("searchWorkflowExecutionHistory")
  async searchWorkflowExecutionHistory(
    obj: any,
    params: {
      searchTerm: string;
      pagination?: {
        page?: number;
        limit?: number;
        sortField?: 'createTime' | 'completeTime' | 'workflowDefinitionId' | 'status';
        sortOrder?: 'ASC' | 'DESC';
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    
    const pagination: IWorkflowHistoryPagination | undefined = params.pagination ? {
      page: params.pagination.page,
      limit: params.pagination.limit,
      sortField: params.pagination.sortField,
      sortOrder: params.pagination.sortOrder?.toLowerCase() as 'asc' | 'desc',
    } : undefined;

    return workflowService.searchWorkflowHistory(params.searchTerm, pagination);
  }

  @roles(["USER"], 'args.context')
  @query("recentWorkflowExecutions")
  async getRecentWorkflowExecutions(
    obj: any,
    params: { limit?: number },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getRecentWorkflowExecutions(params.limit || 10);
  }

  @roles(["USER"], 'args.context')
  @query("workflowExecutionStats")
  async getWorkflowExecutionStats(
    obj: any,
    params: any,
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowExecutionStats();
  }

  // Workflow Schedule Queries
  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowSchedules")
  async getWorkflowSchedules(
    obj: any,
    params: {
      filter?: IWorkflowFilterInput,
      pagination?: IPaginationInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowSchedules(params.pagination);
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowSchedule")
  async getWorkflowSchedule(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowSchedulesForWorkflowId(params.id);
  }

  // Audit and Monitoring Queries
  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @query("workflowAuditLog")
  async getWorkflowAuditLog(
    obj: any,
    params: {
      filter?: IAuditFilterInput,
      pagination?: IPaginationInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowAuditLog(params.filter, params.pagination);
  }

  // Legacy Query
  @roles(["USER"], 'args.context')
  @query("workflowStatus")
  async getWorkflowStatus(
    obj: any,
    params: { name: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowStatus(params.name);
  }

  // MUTATIONS

  // Workflow Execution Mutations
  @roles(["USER"], 'args.context')
  @mutation("startWorkflow")
  async startWorkflow(
    obj: any,
    params: {
      workflowId: string,
      input?: IWorkflowExecutionInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.startWorkflow(params.workflowId, params.input);
    } catch (error) {
      context.log('Error starting workflow', { error, params }, 'error', 'WorkflowResolver');
      throw error;
    }
  }

  // Instance Management Mutations
  @roles(["WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @mutation("pauseWorkflowInstance")
  async pauseWorkflowInstance(
    obj: any,
    params: { instanceId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.pauseWorkflowInstance(params.instanceId);
    } catch (error) {
      context.log('Error pausing workflow instance', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to pause workflow instance: ${error.message}`
      };
    }
  }

  @roles(["WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @mutation("resumeWorkflowInstance")
  async resumeWorkflowInstance(
    obj: any,
    params: { instanceId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.resumeWorkflowInstance(params.instanceId);
    } catch (error) {
      context.log('Error resuming workflow instance', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to resume workflow instance: ${error.message}`
      };
    }
  }

  @roles(["WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @mutation("cancelWorkflowInstance")
  async cancelWorkflowInstance(
    obj: any,
    params: { instanceId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.cancelWorkflowInstance(params.instanceId);
    } catch (error) {
      context.log('Error cancelling workflow instance', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to cancel workflow instance: ${error.message}`
      };
    }
  }

  // Schedule Management Mutations
  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("createWorkflowSchedule")
  async createWorkflowSchedule(
    obj: any,
    params: { config: IScheduleConfigInput },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.createWorkflowSchedule(params.config);
    } catch (error) {
      context.log('Error creating workflow schedule', { error, params }, 'error', 'WorkflowResolver');
      throw error;
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("updateWorkflowSchedule")
  async updateWorkflowSchedule(
    obj: any,
    params: {
      scheduleId: string,
      updates: IUpdateScheduleInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.updateWorkflowSchedule(params.scheduleId, params.updates);
    } catch (error) {
      context.log('Error updating workflow schedule', { error, params }, 'error', 'WorkflowResolver');
      throw error;
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("deleteWorkflowSchedule")
  async deleteWorkflowSchedule(
    obj: any,
    params: { scheduleId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.deleteWorkflowSchedule(params.scheduleId);
    } catch (error) {
      context.log('Error deleting workflow schedule', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to delete workflow schedule: ${error.message}`
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("startSchedule")
  async startSchedule(
    obj: any,
    params: { scheduleId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.startSchedule(params.scheduleId);
    } catch (error) {
      context.log('Error starting workflow schedule', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to start workflow schedule: ${error.message}`
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("stopSchedule")
  async stopSchedule(
    obj: any,
    params: { scheduleId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.stopSchedule(params.scheduleId);
    } catch (error) {
      context.log('Error stopping workflow schedule', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to stop workflow schedule: ${error.message}`
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("reloadSchedules")
  async reloadSchedules(
    obj: any,
    params: any,
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.reloadSchedules();
    } catch (error) {
      context.log('Error reloading workflow schedules', { error }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to reload workflow schedules: ${error.message}`
      };
    }
  }

  // Workflow Execution History Management Mutations
  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("deleteWorkflowExecutionHistory")
  async deleteWorkflowExecutionHistory(
    obj: any,
    params: { instanceId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.deleteWorkflowHistory(params.instanceId);
    } catch (error) {
      context.log('Error deleting workflow execution history', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to delete workflow execution history: ${error.message}`
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("deleteWorkflowExecutionHistoryBatch")
  async deleteWorkflowExecutionHistoryBatch(
    obj: any,
    params: { instanceIds: string[] },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.deleteWorkflowHistoryBatch(params.instanceIds);
    } catch (error) {
      context.log('Error deleting workflow execution history batch', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to delete workflow execution history batch: ${error.message}`
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("clearWorkflowExecutionHistory")
  async clearWorkflowExecutionHistory(
    obj: any,
    params: { workflowDefinitionId: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.clearWorkflowHistory(params.workflowDefinitionId);
    } catch (error) {
      context.log('Error clearing workflow execution history', { error, params }, 'error', 'WorkflowResolver');
      return {
        success: false,
        message: `Failed to clear workflow execution history: ${error.message}`
      };
    }
  }

  // Legacy Mutation
  @roles(["USER"], 'args.context')
  @mutation("startWorkflowLegacy")
  async startWorkflowLegacy(
    obj: any,
    params: {
      name: string,
      data: any
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.startWorkflowLegacy(params.name, params.data);
    } catch (error) {
      context.log('Error starting workflow (legacy)', { error, params }, 'error', 'WorkflowResolver');
      return false;
    }
  }

  // PROPERTY RESOLVERS

  // These property resolvers can be used to resolve nested fields on workflow objects
  // if needed for more complex GraphQL relationships

  @property("WorkflowInstance", "id")
  instanceId(obj: any) {
    return obj._id || obj.id;
  }

  @property("WorkflowInstance", "createdBy")
  async instanceCreatedBy(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    // If createdBy is populated, return it, otherwise fetch user data
    if (typeof obj.createdBy === 'object') {
      return obj.createdBy;
    }
    
    // Fetch user by ID if needed
    const userService = context.getService('core.UserService@1.0.0');
    if (userService && obj.createdBy) {
      return userService.getUserById(obj.createdBy);
    }
    
    return null;
  }

  @property("WorkflowSchedule", "id")
  scheduleId(obj: any) {
    return obj._id || obj.id;
  }

  @property("WorkflowSchedule", "createdBy")
  async scheduleCreatedBy(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    // If createdBy is populated, return it, otherwise fetch user data
    if (typeof obj.createdBy === 'object') {
      return obj.createdBy;
    }
    
    // Fetch user by ID if needed
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
    if (userService && obj.createdBy) {
      return userService.findUserById(obj.createdBy);
    }
    
    return null;
  }

  @property("RegisteredWorkflow", "dependencies")
  async workflowDependencies(obj: any) {
    // Ensure dependencies are properly formatted
    return obj.dependencies || [];
  }

  @property("RegisteredWorkflow", "schedules")
  async workflowSchedules(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    
    // Build the workflow ID from the object properties
    const workflowId = obj.id || `${obj.nameSpace}.${obj.name}@${obj.version}`;
    
    try {
      const result = await workflowService.getWorkflowSchedulesForWorkflowId(workflowId);
      return result;
    } catch (error) {
      context.log('Error fetching schedules for workflow', { error, workflowId }, 'error', 'WorkflowResolver');
      return [];
    }
  }

  @property("RegisteredWorkflow", "instances")
  async workflowInstances(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id } = obj;
    try {
      const workflowService = getWorkflowService(context);
      const pagedInstances = await workflowService.getWorkflowInstances({ id });
      return pagedInstances.instances || [];
    } catch (error) {
      context.log('Error fetching instances for workflow', { error, id }, 'error', 'WorkflowResolver');
      return [];
    }
  }

  @property("RegisteredWorkflow", "status")
  async workflowStatus(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    if(obj.status) {
      return obj.status;
    }

    const workflowService = getWorkflowService(context);
    const status = await workflowService.getWorkflowStatus(obj._id || obj.id);
    return status.status;
  }

  @property("RegisteredWorkflow", "executionHistory")
  async workflowExecutionHistory(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    
    // Build the workflow definition ID from the object properties
    const workflowDefinitionId = obj.id || `${obj.nameSpace}.${obj.name}@${obj.version}`;
    
    try {
      const result = await workflowService.getWorkflowHistoryByDefinitionId(workflowDefinitionId, {
        page: 1,
        limit: 10,
        sortOrder: 'desc'
      });
      return result.instances || [];
    } catch (error) {
      context.log('Error fetching execution history for workflow', { error, workflowDefinitionId }, 'error', 'WorkflowResolver');
      return [];
    }
  }
}

export default WorkflowResolver;
