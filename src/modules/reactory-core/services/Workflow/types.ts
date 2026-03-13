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

// Re-export YAML error types
export type { YamlLoadStage, YamlLoadStatus, IYamlLoadError };

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
  id?: string;
  name: string;
  description?: string;
  workflow: {
    id: string;
    version?: string;
    nameSpace?: string;
  };
  schedule: {
    cron: string;
    timezone?: string;
    enabled?: boolean;
  };
  properties?: any;
  propertiesFormId?: string;
  retry?: {
    attempts: number;
    delay: number;
  };
  timeout?: number;
  maxConcurrent?: number;
}

export interface IUpdateScheduleInput {
  name?: string;
  description?: string;
  workflow?: {
    id: string;
    version?: string;
    nameSpace?: string;
  };
  schedule?: {
    cron: string;
    timezone?: string;
    enabled?: boolean;
  };
  properties?: any;
  propertiesFormId?: string;
  retry?: {
    attempts: number;
    delay: number;
  };
  timeout?: number;
  maxConcurrent?: number;
}

export interface IWorkflowFilterInput {
  searchString?: string;
  nameSpace?: string;
  name?: string;
  version?: string;
  ids?: string[];
  tags?: string[];
  status?: string;
  author?: string;
  isActive?: boolean;
  hasSchedule?: boolean;
  hasErrors?: boolean;
  neverRun?: boolean;
  recentlyUpdated?: boolean;
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

export type WorkflowSourceType = 'MODULE' | 'CATALOG' | 'USER';

/**
 * The processing stage at which a YAML load error occurred.
 * Used to provide fine-grained diagnostic information to the UI.
 */
export type YamlLoadStage = 'REGISTRY' | 'FILE_RESOLVE' | 'FILE_READ' | 'PARSE' | 'VALIDATION';

/**
 * Overall YAML load status.
 * - SUCCESS    - fully loaded and parsed without errors
 * - PARTIAL    - loaded but with validation warnings
 * - NOT_FOUND  - workflow not in registry or file could not be found
 * - IO_ERROR   - file was found but could not be read
 * - PARSE_ERROR - file was read but YAML could not be parsed
 * - REGISTRY_ERROR - the workflow exists but is not a YAML type
 */
export type YamlLoadStatus =
  | 'SUCCESS'
  | 'PARTIAL'
  | 'NOT_FOUND'
  | 'IO_ERROR'
  | 'PARSE_ERROR'
  | 'REGISTRY_ERROR';

/**
 * Describes a single error that occurred during YAML definition loading.
 * Multiple errors can be attached to a single load result.
 */
export interface IYamlLoadError {
  /** The processing stage at which the error occurred */
  stage: YamlLoadStage;
  /** Human-readable description of the error */
  message: string;
  /** Short machine-readable error code */
  code?: string;
  /** Line number within the YAML source (populated for parse errors) */
  line?: number;
  /** Column number within the YAML source (populated for parse errors) */
  column?: number;
  /** Original stack trace (populated in development mode) */
  stack?: string;
}

export interface IYamlWorkflowDefinitionResult {
  nameSpace: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  variables?: Record<string, any>;
  steps: any[];
  designer?: any;
  /** The raw YAML source text (present even when there are parse errors, so the UI can display it) */
  yamlSource?: string;
  /** The source type indicating where this definition was loaded from */
  sourceType?: WorkflowSourceType;
  /** The resolved file path the definition was loaded from */
  location?: string;
  /** Overall load status -- SUCCESS means the definition is fully usable */
  loadStatus: YamlLoadStatus;
  /** Ordered list of errors captured at each processing stage */
  errors?: IYamlLoadError[];
}

// ─── Workflow Definition Save/Validate Input Types ──────────────────────────

export interface IDesignerPositionInput {
  x: number;
  y: number;
}

export interface IDesignerSizeInput {
  width: number;
  height: number;
}

export interface IDesignerCanvasSettingsInput {
  zoom?: number;
  panX?: number;
  panY?: number;
  gridSize?: number;
  snapToGrid?: boolean;
}

export interface IDesignerConnectionMetadataInput {
  id?: string;
  sourceStepId: string;
  sourcePort: string;
  targetStepId: string;
  targetPort: string;
  points?: IDesignerPositionInput[];
  style?: string;
  color?: string;
  label?: string;
}

export interface IDesignerNoteInput {
  id: string;
  text: string;
  position: IDesignerPositionInput;
  size?: IDesignerSizeInput;
  color?: string;
}

export interface IDesignerGroupInput {
  id: string;
  label: string;
  stepIds: string[];
  color?: string;
  collapsed?: boolean;
}

export interface IDesignerPortMetadataInput {
  name: string;
  label?: string;
  position?: IDesignerPositionInput;
  dataType?: string;
}

export interface IStepDesignerPortsMetadataInput {
  inputs?: IDesignerPortMetadataInput[];
  outputs?: IDesignerPortMetadataInput[];
}

export interface IStepDesignerMetadataInput {
  position?: IDesignerPositionInput;
  size?: IDesignerSizeInput;
  color?: string;
  icon?: string;
  collapsed?: boolean;
  helpText?: string;
  ports?: IStepDesignerPortsMetadataInput;
}

export interface IDesignerMetadataInput {
  canvas?: IDesignerCanvasSettingsInput;
  connections?: IDesignerConnectionMetadataInput[];
  notes?: IDesignerNoteInput[];
  groups?: IDesignerGroupInput[];
}

export interface IWorkflowStepInput {
  id: string;
  name?: string;
  description?: string;
  type: string;
  enabled?: boolean;
  continueOnError?: boolean;
  timeout?: number;
  inputs?: any;
  outputs?: any;
  condition?: string;
  dependsOn?: any;
  config?: any;
  steps?: IWorkflowStepInput[];
  designer?: IStepDesignerMetadataInput;
}

export interface IWorkflowDefinitionInput {
  nameSpace: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  inputs?: any;
  outputs?: any;
  variables?: any;
  steps: IWorkflowStepInput[];
  designer?: IDesignerMetadataInput;
}

export interface IWorkflowValidationError {
  field?: string;
  message: string;
  code?: string;
}

export interface IWorkflowValidationResult {
  isValid: boolean;
  errors?: IWorkflowValidationError[];
  warnings?: IWorkflowValidationError[];
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
  
  // YAML Workflow Definitions
  /** Load and parse a YAML workflow definition from the workflow's registered location */
  getWorkflowYamlDefinition(nameSpace: string, name: string, version?: string): Promise<IYamlWorkflowDefinitionResult>;
  
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
  
  // Error retrieval
  getWorkflowErrors(workflowId: string): Promise<Array<{ message: string; code: string; stack?: string }>>;
  
  // Workflow Definition CRUD
  /** Save (create or update) a workflow definition to the YAML catalog */
  saveWorkflowDefinition(definition: IWorkflowDefinitionInput): Promise<IYamlWorkflowDefinitionResult>;
  /** Delete a workflow definition from the YAML catalog */
  deleteWorkflowDefinition(nameSpace: string, name: string, version?: string): Promise<IWorkflowOperationResult>;
  /** Validate a workflow definition without saving it */
  validateWorkflowDefinition(definition: IWorkflowDefinitionInput): Promise<IWorkflowValidationResult>;
}
