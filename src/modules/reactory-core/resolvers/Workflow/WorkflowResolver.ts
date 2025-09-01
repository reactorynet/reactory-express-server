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
  IPaginationInput
} from '../../services/Workflow/types';

// @ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class WorkflowResolver {

  resolver: any;

  // Helper method to get workflow service
  private getWorkflowService(context: Reactory.Server.IReactoryContext): IReactoryWorkflowService {
    return context.getService("core.ReactoryWorkflowService@1.0.0") as IReactoryWorkflowService;
  }

  // System Status & Health Queries
  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowSystemStatus")
  async getSystemStatus(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = this.getWorkflowService(context);
    return workflowService.getSystemStatus();
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowMetrics") 
  async getWorkflowMetrics(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflowMetrics();
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @query("workflowConfigurations")
  async getWorkflowConfigurations(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflows(params.filter, params.pagination);
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowRegistry")
  async getWorkflowRegistry(obj: any, params: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflow(params.namespace, params.name);
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
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflowInstances(params.filter, params.pagination);
  }

  @roles(["USER"], 'args.context')
  @query("workflowInstance")
  async getWorkflowInstance(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflowInstance(params.id);
  }

  // Workflow Schedule Queries
  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowSchedules")
  async getWorkflowSchedules(
    obj: any,
    params: {
      pagination?: IPaginationInput
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflowSchedules(params.pagination);
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"], 'args.context')
  @query("workflowSchedule")
  async getWorkflowSchedule(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = this.getWorkflowService(context);
    return workflowService.getWorkflowSchedule(params.id);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const workflowService = this.getWorkflowService(context);
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
    const userService = context.getService('core.UserService@1.0.0');
    if (userService && obj.createdBy) {
      return userService.getUserById(obj.createdBy);
    }
    
    return null;
  }

  @property("RegisteredWorkflow", "dependencies")
  async workflowDependencies(obj: any) {
    // Ensure dependencies are properly formatted
    return obj.dependencies || [];
  }

  @property("AuditLogEntry", "id")
  auditLogId(obj: any) {
    return obj._id || obj.id;
  }
}

export default WorkflowResolver;
