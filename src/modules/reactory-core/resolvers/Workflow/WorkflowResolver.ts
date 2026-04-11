import Reactory from '@reactorynet/reactory-core';
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
  IWorkflowDefinitionInput,
} from '../../services/Workflow/types';
import { IWorkflowInstanceDocument } from '@reactory/server-modules/reactory-core/workflow/LifecycleManager';
import { IScheduleConfig, IScheduledWorkflow } from '@reactory/server-modules/reactory-core/workflow';
import { YamlWorkflowExecutor } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/execution/YamlWorkflowExecutor';
import { YamlStepRegistry } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/registry/YamlStepRegistry';
import { InstanceResourceManager } from '@reactory/server-modules/reactory-core/workflow/InstanceResourceManager';
import safeUrl from '@reactory/server-core/utils/url/safeUrl';



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

  // YAML Workflow Definitions
  @roles(["USER"], 'args.context')
  @query("workflowYamlDefinition")
  async getWorkflowYamlDefinition(
    obj: any,
    params: {
      nameSpace: string,
      name: string,
      version?: string
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    return workflowService.getWorkflowYamlDefinition(params.nameSpace, params.name, params.version);
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
  @query("workflowInstanceLogFileUrl")
  async getWorkflowInstanceLogFileUrl(
    obj: any,
    params: { instanceId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<string | null> {
    const workflowService = getWorkflowService(context);
    const instance = await workflowService.getWorkflowHistoryById(params.instanceId);
    if (!instance) return null;

    // workflowDefinitionId format: "namespace.Name@version"
    const defId: string = (instance as any).workflowDefinitionId || '';
    const atIdx = defId.lastIndexOf('@');
    const version = atIdx !== -1 ? defId.substring(atIdx + 1) : '1.0.0';
    const withoutVersion = atIdx !== -1 ? defId.substring(0, atIdx) : defId;
    const dotIdx = withoutVersion.indexOf('.');
    const nameSpace = dotIdx !== -1 ? withoutVersion.substring(0, dotIdx) : withoutVersion;
    const name = dotIdx !== -1 ? withoutVersion.substring(dotIdx + 1) : withoutVersion;

    const rm = new InstanceResourceManager(nameSpace, name, version, params.instanceId);
    const logPath = rm.getLogFilePath();

    const fs = await import('node:fs');
    if (!fs.existsSync(logPath)) return null;

    const dataRoot = process.env.REACTORY_DATA || process.env.APP_DATA_ROOT || '';
    const path = await import('node:path');
    const relPath = path.relative(dataRoot, logPath);
    // path is protected so we need to add a jwt token for
    // the authenticated user
    // get the x-client-id from the request headers to include in the token for auditing purposes
    const clientId = context?.request?.headers?.['x-client-id'] || '';
    const clientKey = context?.request?.headers?.['x-client-key'] || '';    
    return safeUrl([process.env.CDN_ROOT || 'http://localhost:4000/cdn', `${relPath}?x-client-id=${encodeURIComponent(clientId)}&x-client-key=${encodeURIComponent(clientKey)}`]);
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
    } catch (error: Error) {
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
    } catch (error: Error) {
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
    } catch (error: Error) {
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
    } catch (error: Error) {
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
    } catch (error: Error) {
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
    } catch (error: Error) {
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
    } catch (error: Error) {
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
    } catch (error: Error) {
      context.log('Error starting workflow (legacy)', { error, params }, 'error', 'WorkflowResolver');
      return false;
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("saveWorkflowDefinition")
  async saveWorkflowDefinition(
    obj: any,
    params: { definition: IWorkflowDefinitionInput },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.saveWorkflowDefinition(params.definition);
    } catch (error: any) {
      context.log('Error saving workflow definition', { error, params }, 'error', 'WorkflowResolver');
      return {
        id: '',
        name: params.definition.name,
        nameSpace: params.definition.nameSpace,
        version: params.definition.version,
        loadStatus: 'NOT_FOUND',
        raw: null,
        definition: null,
        designer: null,
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("saveWorkflowYaml")
  async saveWorkflowYaml(
    obj: any,
    params: { input: { nameSpace: string; name: string; version: string; yamlContent: string } },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      const { nameSpace, name, version, yamlContent } = params.input;
      return await workflowService.saveWorkflowYaml(nameSpace, name, version, yamlContent);
    } catch (error: any) {
      context.log('Error saving raw YAML workflow', { error, params }, 'error', 'WorkflowResolver');
      return {
        nameSpace: params.input.nameSpace,
        name: params.input.name,
        version: params.input.version,
        steps: [],
        loadStatus: 'NOT_FOUND',
        errors: [{ stage: 'FILE_RESOLVE', message: `Save failed: ${error.message}`, code: 'SAVE_ERROR' }],
      };
    }
  }

  @roles(["ADMIN", "WORKFLOW_ADMIN"], 'args.context')
  @mutation("deleteWorkflowDefinition")
  async deleteWorkflowDefinition(
    obj: any,
    params: { nameSpace: string; name: string; version?: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.deleteWorkflowDefinition(params.nameSpace, params.name, params.version);
    } catch (error: any) {
      context.log('Error deleting workflow definition', { error, params }, 'error', 'WorkflowResolver');
      return { success: false, message: `Error deleting workflow definition: ${error.message}` };
    }
  }

  @roles(["USER"], 'args.context')
  @mutation("validateWorkflowDefinition")
  async validateWorkflowDefinition(
    obj: any,
    params: { definition: IWorkflowDefinitionInput },
    context: Reactory.Server.IReactoryContext
  ) {
    const workflowService = getWorkflowService(context);
    try {
      return await workflowService.validateWorkflowDefinition(params.definition);
    } catch (error: any) {
      context.log('Error validating workflow definition', { error, params }, 'error', 'WorkflowResolver');
      return {
        valid: false,
        errors: [{ field: 'definition', message: `Validation failed: ${error.message}`, code: 'VALIDATION_ERROR' }],
        warnings: [],
      };
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

  @property("WorkflowInstance", "name")
  instanceName(obj: any) {
    if (obj.name) return obj.name;
    // In-memory instances have workflowId like "ns.Name@ver"
    // History items have workflowDefinitionId like "ns.Name@ver"
    const fqn = obj.workflowId || obj.workflowDefinitionId || '';
    const [nsName] = fqn.split('@');
    const parts = nsName.split('.');
    return parts.length > 1 ? parts.slice(1).join('.') : parts[0] || '';
  }

  @property("WorkflowInstance", "nameSpace")
  instanceNameSpace(obj: any) {
    if (obj.nameSpace) return obj.nameSpace;
    const fqn = obj.workflowId || obj.workflowDefinitionId || '';
    const [nsName] = fqn.split('@');
    const parts = nsName.split('.');
    return parts.length > 1 ? parts[0] : '';
  }

  @property("WorkflowInstance", "version")
  instanceVersion(obj: any) {
    if (obj.version) return String(obj.version);
    const fqn = obj.workflowId || obj.workflowDefinitionId || '';
    const atIdx = fqn.lastIndexOf('@');
    return atIdx > -1 ? fqn.substring(atIdx + 1) : '1.0.0';
  }

  @property("WorkflowInstance", "startTime")
  instanceStartTime(obj: any) {
    return obj.startTime || obj.startedAt || obj.createTime || null;
  }

  @property("WorkflowInstance", "endTime")
  instanceEndTime(obj: any) {
    return obj.endTime || obj.completedAt || obj.completeTime || null;
  }

  @property("WorkflowInstance", "duration")
  instanceDuration(obj: any) {
    if (obj.duration != null) return obj.duration;
    const start = obj.startTime || obj.startedAt || obj.createTime;
    const end = obj.endTime || obj.completedAt || obj.completeTime;
    if (start && end) return new Date(end).getTime() - new Date(start).getTime();
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

  @property("RegisteredWorkflow", "id")
  workflowId(obj: any) {
    return obj.id || `${obj.nameSpace}.${obj.name}@${obj.version}`;
  }

  @property("RegisteredWorkflow", "dependencies")
  async workflowDependencies(obj: any) {
    // Ensure dependencies are properly formatted
    return obj.dependencies || [];
  }

  @property("RegisteredWorkflow", "errors")
  async workflowErrors(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const workflowService = getWorkflowService(context);
    const workflowId = obj.id || `${obj.nameSpace}.${obj.name}@${obj.version}`;

    try {
      return await workflowService.getWorkflowErrors(workflowId);
    } catch (error) {
      context.log('Error fetching errors for workflow', { error, workflowId }, 'error', 'WorkflowResolver');
      return [];
    }
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

  @property("WorkflowInstance", "status")
  async instanceStatus(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const status = obj.status;

    // Numeric status from workflow-es MongoDB documents
    if (typeof status === 'number') {
      const numericMap: Record<number, string> = {
        [WorkflowESStatus.PENDING]: 'PENDING',
        [WorkflowESStatus.RUNNABLE]: 'RUNNING',
        [WorkflowESStatus.COMPLETE]: 'COMPLETED',
        [WorkflowESStatus.TERMINATED]: 'FAILED',
        [WorkflowESStatus.SUSPENDED]: 'PAUSED',
      };
      return numericMap[status] || 'PENDING';
    }

    // String status from LifecycleManager (lowercase) or already uppercase
    if (typeof status === 'string') {
      const normalized = status.toUpperCase();
      const validStatuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'CANCELLED'];
      if (validStatuses.includes(normalized)) {
        return normalized;
      }
      // Handle LifecycleManager's 'cleaning_up' → 'RUNNING'
      if (normalized === 'CLEANING_UP') {
        return 'RUNNING';
      }
    }

    return 'PENDING';
  }

  @property("WorkflowSchedule", "workflow")
  async workflowReferenceResolver(obj: IScheduleConfig) {
    if (!obj) return null;
    const { workflow } = obj;
    if (!workflow) return null;
    if (!workflow.id) return null;
    if (workflow.id.includes('.')) {
      // If the ID is already in the format "namespace.name@version", return it as is
      // extract the namespace, name, and version from the ID
      const [nameSpaceName, version] = workflow.id.split('@');
      const [nameSpace, name] = nameSpaceName.split('.');

      return {
        id: workflow.id,
        nameSpace: nameSpace,
        name: name,
        version: version
      };
    }
    // if the id is not in the format "namespace.name@version", we check if name, namespace, and version are provided and construct the id
    if (workflow.nameSpace && workflow.name && workflow.version) {
      return {
        id: `${workflow.nameSpace}.${workflow.name}@${workflow.version}`,
        nameSpace: workflow.nameSpace,
        name: workflow.name,
        version: workflow.version
      };
    }
  }

  // YamlWorkflowDefinition property resolvers

  @property("YamlWorkflowDefinition", "validationErrors")
  async yamlValidationErrors(obj: any, _args: any, context: Reactory.Server.IReactoryContext) {
    // Only validate if the definition was successfully loaded and has steps
    if (!obj || obj.loadStatus !== 'SUCCESS' || !obj.steps || obj.steps.length === 0) {
      return null;
    }

    try {
      const stepRegistry = new YamlStepRegistry();
      const executor = new YamlWorkflowExecutor(stepRegistry, context);

      const result = await executor.validateWorkflow({
        nameSpace: obj.nameSpace,
        name: obj.name,
        version: obj.version,
        description: obj.description,
        author: obj.author,
        tags: obj.tags,
        steps: obj.steps,
      });

      if (result.valid) {
        return [];
      }

      return result.errors.map((e: any) => ({
        field: e.stepId || e.path || null,
        message: e.message,
        code: e.code || null,
      }));
    } catch (error) {
      context.log(
        `Error validating YAML workflow ${obj.nameSpace}.${obj.name}`,
        { error },
        'error',
        'WorkflowResolver'
      );
      return [{
        field: null,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_EXCEPTION',
      }];
    }
  }
}

export default WorkflowResolver;
