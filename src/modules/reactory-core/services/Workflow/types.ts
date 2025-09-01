
// Workflow Service Types
export interface IWorkflowSystemStatus {
  system: {
    initialized: boolean;
    status: 'HEALTHY' | 'INITIALIZING' | 'ERROR';
    timestamp: Date;
  };
  lifecycle: IWorkflowLifecycleStats;
  errors: IWorkflowErrorStats[];
  configuration: IConfigurationStats;
  security: ISecurityStats;
}

export interface IWorkflowLifecycleStats {
  activeInstances: number;
  completedInstances: number;
  failedInstances: number;
  pausedInstances: number;
  totalInstances: number;
  averageExecutionTime: number;
  lastCleanupTime?: Date;
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

export interface ISecurityStats {
  authenticatedRequests: number;
  unauthorizedAttempts: number;
  permissionDenials: number;
  activePermissions: string[];
  securityEvents: ISecurityEvent[];
}

export interface ISecurityEvent {
  event: string;
  timestamp: Date;
  userId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface IWorkflowExecutionInput {
  input: any;
  tags?: string[];
  priority?: number;
  timeout?: number;
}

export interface IScheduleConfigInput {
  workflowName: string;
  namespace: string;
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
  namespace?: string;
  tags?: string[];
  status?: string;
  author?: string;
  isActive?: boolean;
}

export interface IInstanceFilterInput {
  workflowName?: string;
  namespace?: string;
  status?: string;
  createdBy?: string;
  startTimeFrom?: Date;
  startTimeTo?: Date;
}

export interface IAuditFilterInput {
  workflowName?: string;
  namespace?: string;
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

export interface IWorkflowOperationResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface IReactoryWorkflowService extends Reactory.Service.IReactoryDefaultService {
  // System Status & Health
  getSystemStatus(): Promise<IWorkflowSystemStatus>;
  getWorkflowMetrics(): Promise<any>;
  getWorkflowConfigurations(): Promise<any>;
  
  // Workflow Registry
  getWorkflows(filter?: IWorkflowFilterInput, pagination?: IPaginationInput): Promise<any>;
  getWorkflowRegistry(): Promise<any>;
  getWorkflow(namespace: string, name: string): Promise<any>;
  
  // Workflow Instances
  getWorkflowInstances(filter?: IInstanceFilterInput, pagination?: IPaginationInput): Promise<any>;
  getWorkflowInstance(instanceId: string): Promise<any>;
  startWorkflow(workflowId: string, input?: IWorkflowExecutionInput): Promise<any>;
  pauseWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult>;
  resumeWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult>;
  cancelWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult>;
  
  // Workflow Schedules
  getWorkflowSchedules(pagination?: IPaginationInput): Promise<any>;
  getWorkflowSchedule(scheduleId: string): Promise<any>;
  createWorkflowSchedule(config: IScheduleConfigInput): Promise<any>;
  updateWorkflowSchedule(scheduleId: string, updates: IUpdateScheduleInput): Promise<any>;
  deleteWorkflowSchedule(scheduleId: string): Promise<IWorkflowOperationResult>;
  startSchedule(scheduleId: string): Promise<IWorkflowOperationResult>;
  stopSchedule(scheduleId: string): Promise<IWorkflowOperationResult>;
  reloadSchedules(): Promise<IWorkflowOperationResult>;
  
  // Audit and Monitoring
  getWorkflowAuditLog(filter?: IAuditFilterInput, pagination?: IPaginationInput): Promise<any>;
  
  // Legacy Support
  getWorkflowStatus(name: string): Promise<any>;
  startWorkflowLegacy(name: string, data: any): Promise<boolean>;
}