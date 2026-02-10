import { 
  IWorkflowInstance, 
  IWorkflowDependency, 
  IWorkflowLifecycleStats,
  IWorkflowHistoryFilter,
  IWorkflowHistoryPagination,
  IPaginatedWorkflowHistory,
  IWorkflowHistoryItem,
  IWorkflowExecutionStats,
  WorkflowESStatus,
} from "@reactory/server-modules/reactory-core/workflow/LifecycleManager/LifecycleManager";
import { ISecurityStats } from "@reactory/server-modules/reactory-core/workflow/SecurityManager/SecurityManager";
import { IWorkflowConfig } from "@reactory/server-modules/reactory-core/workflow/ConfigurationManager/ConfigurationManager";
import { IScheduleConfig, IScheduledWorkflow, ISchedulerStats } from "@reactory/server-modules/reactory-core/workflow/Scheduler/Scheduler";

// Re-export types from LifecycleManager for convenience
export {
  IWorkflowHistoryFilter,
  IWorkflowHistoryPagination,
  IPaginatedWorkflowHistory,
  IWorkflowHistoryItem,
  IWorkflowExecutionStats,
  WorkflowESStatus,
};

// Workflow Service Types
export interface IWorkflowSystemStatus {
  system: {
    initialized: boolean;
    status: 'HEALTHY' | 'INITIALIZING' | 'ERROR';
    timestamp: Date;
  };
  lifecycle: IWorkflowLifecycleStats;
  errors: Map<string, IWorkflowErrorStats>;
  configuration: IConfigurationStats;
  security: ISecurityStats;
}

export interface IWorkflowErrorStats {
  errorType: string;
  count: number;
  lastOccurrence: Date;
  workflowName?: string;
  message?: string;
  stack?: string;
}

export interface IConfigurationStats {
  totalConfigurations: number;
  activeConfigurations: number;
  validationErrors: number;
  lastValidated?: Date;
  defaultSettings?: any;
  customSettings?: any;
}

export interface IWorkflowExecutionInput {
  input: any;
  tags?: string[];
  priority?: number;
  timeout?: number;  
}

export interface IScheduleConfigInput {
  workflowName: string;
  nameSpace: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  startDate?: Date;
  endDate?: Date;
  maxExecutions?: number;
  input?: any;
  tags?: string[];
  description?: string;
}

export interface IUpdateScheduleInput {
  cronExpression?: string;
  timezone?: string;
  enabled?: boolean;
  startDate?: Date;
  endDate?: Date;
  maxExecutions?: number;
  input?: any;
  tags?: string[];
  description?: string;
}

export interface IWorkflowFilterInput {
  nameSpace?: string;
  tags?: string[];
  status?: string;
  author?: string;
  isActive?: boolean;
}

export interface IInstanceFilterInput {
  id?: string;
  nameSpace?: string;
  name?: string;
  version?: string;
  status?: string;
  createdBy?: string;
  startTimeFrom?: Date;
  startTimeTo?: Date;
}

export interface IAuditFilterInput {
  workflowName?: string;
  nameSpace?: string;
  action?: string;
  resource?: string;
  userId?: string;
  success?: boolean;
  timestampFrom?: Date;
  timestampTo?: Date;
}

export interface IPaginationInput {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface IPaginationInfo {
  page: number;
  pages: number;
  limit: number;
  total: number;
}

export interface IWorkflowOperationResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface IWorkflowStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

export interface RegisteredWorkflow {
  id: string;
  name: string;
  nameSpace: string;
  version: string;
  description: string;
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  status: 'INACTIVE' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' | 'FAILED';
  configuration: IWorkflowConfig;
  instances: IWorkflowInstance[];
  dependencies: IWorkflowDependency[];
  schedule: IScheduleConfig;
  schedules: IScheduleConfig[];
  statistics: IWorkflowStatistics;
  errors: IWorkflowErrorStats[];
}

export interface IWorkflowMetrics {
  lifecycle: IWorkflowLifecycleStats;
  scheduler: ISchedulerStats;
  errors: Map<string, IWorkflowErrorStats>;
  configuration: IConfigurationStats;
  security: ISecurityStats;
}

export interface IWorkflowConfigurationResponse {
  configurations: Record<string, IWorkflowConfig>;
  validation: {
    isValid: boolean;
    errors: any[];
    warnings: any[];
  };
}

export interface IPaginatedWorkflows {
  workflows: RegisteredWorkflow[];
  pagination: IPaginationInfo;
}

export interface IWorkflowRegistryStats {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  nameSpaces: string[];
  versions: Record<string, string[]>;
  lastRegistered: Date;
  registrationErrors: number;
}

export interface IWorkflowRegistryResponse {
  workflows: RegisteredWorkflow[];
  stats: IWorkflowRegistryStats;
}

export interface IPaginatedInstances {
  instances: IWorkflowInstance[];
  pagination: IPaginationInfo;
}

export interface IPaginatedSchedules {
  schedules: IScheduledWorkflow[];
  pagination: IPaginationInfo;
}

export interface IFilteredSchedulesResponse {
  schedules: IScheduledWorkflow[];
  filter: {
    nameSpace?: string;
    name?: string;
    version?: string;
  };
  pagination: IPaginationInfo;
}

export interface IAuditLogEntry {
  // Define properties based on usage or expectation
  id?: string;
  timestamp?: Date;
  [key: string]: any; 
}

export interface IPaginatedAuditLogs {
  entries: IAuditLogEntry[];
  pagination: IPaginationInfo;
}

export interface IWorkflowStatusResponse {
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' | 'FAILED';
  errors?: IWorkflowErrorStats[];
  statistics?: IWorkflowStatistics;
  configuration?: IWorkflowConfig;
  instances?: IWorkflowInstance[];
  dependencies?: IWorkflowDependency[];
  schedule?: IScheduleConfig;
  schedules?: IScheduleConfig[];  
}

export interface IReactoryWorkflowService extends Reactory.Service.IReactoryDefaultService {
  // System Status & Health
  getSystemStatus(): Promise<IWorkflowSystemStatus>;
  getWorkflowMetrics(): Promise<IWorkflowMetrics>;
  getWorkflowConfigurations(): Promise<IWorkflowConfigurationResponse>;
  
  // Workflow Registry
  getWorkflows(filter?: IWorkflowFilterInput, pagination?: IPaginationInput): Promise<IPaginatedWorkflows>;
  getWorkflowRegistry(): Promise<IWorkflowRegistryResponse>;
  getWorkflow(nameSpace: string, name: string): Promise<RegisteredWorkflow>;
  getWorkflowWithId(id: string): Promise<RegisteredWorkflow>;
  
  // Workflow Instances (in-memory)
  getWorkflowInstances(filter?: IInstanceFilterInput, pagination?: IPaginationInput): Promise<IPaginatedInstances>;
  getWorkflowInstance(instanceId: string): Promise<IWorkflowInstance>;
  startWorkflow(workflowId: string, input?: IWorkflowExecutionInput): Promise<IWorkflowInstance>;
  pauseWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult>;
  resumeWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult>;
  cancelWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult>;
  
  // Workflow History (MongoDB persistence)
  getWorkflowHistory(
    filter?: IWorkflowHistoryFilter,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory>;
  getWorkflowHistoryById(instanceId: string): Promise<IWorkflowHistoryItem | null>;
  getWorkflowHistoryByDefinitionId(
    workflowDefinitionId: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory>;
  getWorkflowHistoryByStatus(
    status: WorkflowESStatus | WorkflowESStatus[],
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory>;
  getWorkflowExecutionStats(): Promise<IWorkflowExecutionStats>;
  searchWorkflowHistory(
    searchTerm: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory>;
  getRecentWorkflowExecutions(limit?: number): Promise<IWorkflowHistoryItem[]>;
  
  // Workflow History Management
  deleteWorkflowHistory(instanceId: string): Promise<IWorkflowOperationResult>;
  deleteWorkflowHistoryBatch(instanceIds: string[]): Promise<IWorkflowOperationResult>;
  clearWorkflowHistory(workflowDefinitionId: string): Promise<IWorkflowOperationResult>;
  
  // Workflow Schedules
  getWorkflowSchedules(pagination?: IPaginationInput): Promise<IPaginatedSchedules>;
  getWorkflowSchedule(scheduleId: string): Promise<IScheduledWorkflow>;
  getWorkflowSchedulesForWorkflowId(workflowId: string): Promise<IScheduleConfig[]>; 
  createWorkflowSchedule(config: IScheduleConfigInput): Promise<IScheduledWorkflow>;
  updateWorkflowSchedule(scheduleId: string, updates: IUpdateScheduleInput): Promise<IScheduledWorkflow>;
  deleteWorkflowSchedule(scheduleId: string): Promise<IWorkflowOperationResult>;
  startSchedule(scheduleId: string): Promise<IWorkflowOperationResult>;
  stopSchedule(scheduleId: string): Promise<IWorkflowOperationResult>;
  reloadSchedules(): Promise<IWorkflowOperationResult>;
  filterSchedulesByWorkflowProperties(
    nameSpace?: string,
    name?: string,
    version?: string,
    pagination?: IPaginationInput
  ): Promise<IFilteredSchedulesResponse>;
  
  // Audit and Monitoring
  getWorkflowAuditLog(filter?: IAuditFilterInput, pagination?: IPaginationInput): Promise<IPaginatedAuditLogs>;
  
  // Legacy Support
  getWorkflowStatus(name: string): Promise<IWorkflowStatusResponse>;
  startWorkflowLegacy(name: string, data: any): Promise<boolean>;
}
