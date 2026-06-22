import logger from '../../../../logging';
import { EventEmitter } from 'events';
import {
  IPersistenceProvider,
  WorkflowInstance,
  WorkflowInstanceQuery,
} from '@reactorynet/workflow-es';
import {
  WorkflowESStatus,
  ExecutionPointerStatus,
  getStatusLabel,
  getExecutionPointerStatusLabel,
} from './models';

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  CLEANING_UP = 'cleaning_up',
}

export enum WorkflowPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface IWorkflowInstance {
  id: string;
  workflowId: string;
  version: string;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  cancelledAt?: Date;
  error?: Error;
  metadata?: Record<string, any>;
  dependencies: string[]; // Array of workflow instance IDs this depends on
  dependents: string[]; // Array of workflow instance IDs that depend on this
  cleanupTasks: string[]; // Array of cleanup task IDs
  resourceUsage: {
    memory: number; // MB
    cpu: number; // Percentage
    disk: number; // MB
  };
}

export interface IWorkflowDependency {
  workflowId: string;
  version: string;
  condition: 'completed' | 'failed' | 'any';
  timeout?: number; // milliseconds
}

export interface IWorkflowLifecycleConfig {
  maxConcurrentWorkflows: number;
  maxWorkflowDuration: number; // milliseconds
  cleanupInterval: number; // milliseconds
  statusUpdateInterval: number; // milliseconds
  dependencyTimeout: number; // milliseconds
  resourceThresholds: {
    memory: number; // MB
    cpu: number; // percentage
    disk: number; // MB
  };
}

export interface IWorkflowLifecycleStats {
  totalWorkflows: number;
  runningWorkflows: number;
  pausedWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  cancelledWorkflows: number;
  averageExecutionTime: number; // milliseconds
  lastCleanupTime?: Date;
  resourceUtilization: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

/**
 * Interface for workflow history filter (for querying persisted data)
 */
export interface IWorkflowHistoryFilter {
  workflowDefinitionId?: string;
  status?: WorkflowESStatus | WorkflowESStatus[];
  createdAfter?: Date;
  createdBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
  searchTerm?: string;
}

/**
 * Interface for workflow history pagination
 */
export interface IWorkflowHistoryPagination {
  page?: number;
  limit?: number;
  sortField?: 'createTime' | 'completeTime' | 'workflowDefinitionId' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for paginated workflow history results
 */
export interface IPaginatedWorkflowHistory {
  instances: IWorkflowHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Interface for a step execution error captured by the workflow engine
 */
export interface IStepExecutionError {
  message: string;
  stack?: string | null;
  errorTime: string;
  retryCount: number;
}

/**
 * Interface for execution pointer summary
 */
export interface IExecutionPointerSummary {
  id: string;
  stepId: number;
  /** Human-readable step name (the YAML step id for bridged workflows), if set. */
  stepName?: string | null;
  status: ExecutionPointerStatus;
  statusLabel: string;
  startTime?: Date | null;
  endTime?: Date | null;
  duration?: number | null;
  retryCount: number;
  active: boolean;
  persistenceData?: any;
  eventData?: any;
  eventName?: string | null;
  outcome?: any;
  /** The most recent error message from the last failed execution of this step */
  errorMessage?: string | null;
  /** The most recent error stack trace from the last failed execution of this step */
  errorStack?: string | null;
  /** The time the most recent error occurred */
  errorTime?: string | null;
  /** Full array of errors captured across all retry attempts */
  errors?: IStepExecutionError[];
}

/**
 * Interface for a workflow history item (returned by the read layer)
 */
export interface IWorkflowHistoryItem {
  id: string;
  workflowDefinitionId: string;
  version: number;
  status: WorkflowESStatus;
  statusLabel: string;
  description?: string | null;
  createTime: Date;
  completeTime?: Date | null;
  duration?: number | null; // milliseconds
  data: Record<string, any>;
  executionPointers: IExecutionPointerSummary[];
  stepCount: number;
  completedStepCount: number;
  failedStepCount: number;
}

/**
 * Interface for workflow execution statistics from persisted data
 */
export interface IWorkflowExecutionStats {
  total: number;
  pending: number;
  runnable: number;
  complete: number;
  terminated: number;
  suspended: number;
  averageCompletionTime?: number;
  byWorkflowDefinition: {
    workflowDefinitionId: string;
    total: number;
    complete: number;
    terminated: number;
  }[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Map a WorkflowInstance (from IPersistenceProvider) to the flat
 * IWorkflowHistoryItem shape consumed by GraphQL / the UI.
 *
 * The engine's WorkflowStatus values:
 *   Runnable=0  Suspended=1  Complete=2  Terminated=3  DeadLettered=4
 *
 * We map them onto WorkflowESStatus:
 *   PENDING=0   RUNNABLE=1   COMPLETE=2  TERMINATED=3  SUSPENDED=4
 *
 * WorkflowInstance.status is already numeric; we cast it to WorkflowESStatus
 * (same numeric space for the statuses that exist).
 */
function mapProviderStatus(engineStatus: number): WorkflowESStatus {
  // engine: Runnable=0 → display: PENDING (the "waiting to run" state)
  // engine: Suspended=1 → display: SUSPENDED
  // engine: Complete=2 → display: COMPLETE
  // engine: Terminated=3 → display: TERMINATED
  // engine: DeadLettered=4 → display: TERMINATED (terminal)
  switch (engineStatus) {
    case 0: return WorkflowESStatus.PENDING;   // Runnable
    case 1: return WorkflowESStatus.SUSPENDED; // Suspended
    case 2: return WorkflowESStatus.COMPLETE;  // Complete
    case 3: return WorkflowESStatus.TERMINATED; // Terminated
    case 4: return WorkflowESStatus.TERMINATED; // DeadLettered → Terminated
    default: return WorkflowESStatus.PENDING;
  }
}

/**
 * Map a provider PointerStatus numeric value to our ExecutionPointerStatus enum.
 * PointerStatus: Legacy=0 Pending=1 Running=2 Complete=3 Sleeping=4
 *                WaitingForEvent=5 Failed=6 Compensated=7 DeadLettered=8
 * ExecutionPointerStatus mirrors these values exactly.
 */
function mapPointerStatus(engineStatus: number): ExecutionPointerStatus {
  // Values happen to match; just cast
  return engineStatus as ExecutionPointerStatus;
}

function transformToHistoryItem(instance: WorkflowInstance): IWorkflowHistoryItem {
  const status = mapProviderStatus(instance.status);

  const completeTime = instance.completeTime instanceof Date
    ? instance.completeTime
    : instance.completeTime
      ? new Date(instance.completeTime as any)
      : null;

  const createTime = instance.createTime instanceof Date
    ? instance.createTime
    : new Date(instance.createTime as any);

  const duration = completeTime && createTime
    ? completeTime.getTime() - createTime.getTime()
    : null;

  const executionPointers: IExecutionPointerSummary[] = (instance.executionPointers || []).map(pointer => {
    const startTime = pointer.startTime instanceof Date
      ? pointer.startTime
      : pointer.startTime ? new Date(pointer.startTime as any) : null;
    const endTime = pointer.endTime instanceof Date
      ? pointer.endTime
      : pointer.endTime ? new Date(pointer.endTime as any) : null;

    const pointerDuration = endTime && startTime
      ? endTime.getTime() - startTime.getTime()
      : null;

    // Extract error data persisted by the workflow-es executor
    const stepErrors: IStepExecutionError[] = pointer.persistenceData?._errors || [];
    const lastError = stepErrors.length > 0 ? stepErrors[stepErrors.length - 1] : null;

    return {
      id: pointer.id,
      stepId: pointer.stepId,
      // The YAML→engine bridge sets pointer.stepName to the YAML step id so the
      // inspector can show meaningful names instead of "Step <n>".
      stepName: (pointer as any).stepName || null,
      status: mapPointerStatus(pointer.status),
      statusLabel: getExecutionPointerStatusLabel(mapPointerStatus(pointer.status)),
      startTime,
      endTime,
      duration: pointerDuration,
      retryCount: pointer.retryCount,
      active: pointer.active,
      persistenceData: pointer.persistenceData || null,
      eventData: pointer.eventData || null,
      eventName: pointer.eventName || null,
      outcome: pointer.outcome || null,
      errorMessage: lastError?.message || null,
      errorStack: lastError?.stack || null,
      errorTime: lastError?.errorTime || null,
      errors: stepErrors,
    };
  });

  const completedStepCount = executionPointers.filter(
    p => p.status === ExecutionPointerStatus.COMPLETE
  ).length;

  const failedStepCount = executionPointers.filter(
    p => p.status === ExecutionPointerStatus.FAILED
  ).length;

  return {
    id: instance.id,
    workflowDefinitionId: instance.workflowDefinitionId,
    version: instance.version,
    status,
    statusLabel: getStatusLabel(status),
    description: (instance as any).description || null,
    createTime,
    completeTime,
    duration,
    data: instance.data || {},
    executionPointers,
    stepCount: executionPointers.length,
    completedStepCount,
    failedStepCount,
  };
}

/**
 * Build a WorkflowInstanceQuery from IWorkflowHistoryFilter + IWorkflowHistoryPagination.
 */
function buildQuery(
  filter?: IWorkflowHistoryFilter,
  pagination?: IWorkflowHistoryPagination
): WorkflowInstanceQuery {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 10;

  const query: WorkflowInstanceQuery = {
    skip: (page - 1) * limit,
    take: limit,
    sortField: (pagination?.sortField ?? 'createTime') as any,
    sortOrder: pagination?.sortOrder ?? 'desc',
  };

  if (filter?.workflowDefinitionId) {
    query.workflowDefinitionId = filter.workflowDefinitionId;
  }
  if (filter?.status !== undefined) {
    if (Array.isArray(filter.status)) {
      query.status = filter.status as number[];
    } else {
      query.status = filter.status as number;
    }
  }
  if (filter?.createdAfter) query.createdAfter = filter.createdAfter;
  if (filter?.createdBefore) query.createdBefore = filter.createdBefore;
  if (filter?.completedAfter) query.completedAfter = filter.completedAfter;
  if (filter?.completedBefore) query.completedBefore = filter.completedBefore;
  if (filter?.searchTerm) query.searchTerm = filter.searchTerm;

  return query;
}

// ──────────────────────────────────────────────────────────────────────────────
// WorkflowLifecycleManager
// ──────────────────────────────────────────────────────────────────────────────

export class WorkflowLifecycleManager extends EventEmitter {
  private workflows: Map<string, IWorkflowInstance> = new Map();
  private dependencies: Map<string, IWorkflowDependency[]> = new Map();
  private config: IWorkflowLifecycleConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private statusUpdateTimer?: NodeJS.Timeout;
  private _isInitialized: boolean = false;
  /** Active IPersistenceProvider (null when using in-memory / not set) */
  private persistence: IPersistenceProvider | null = null;

  constructor(config: Partial<IWorkflowLifecycleConfig> = {}) {
    super();
    this.config = {
      maxConcurrentWorkflows: 10,
      maxWorkflowDuration: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      statusUpdateInterval: 60000, // 1 minute
      dependencyTimeout: 300000, // 5 minutes
      resourceThresholds: {
        memory: 512, // 512 MB
        cpu: 80, // 80%
        disk: 1024, // 1 GB
      },
      ...config,
    };
  }

  /**
   * Initialize the lifecycle manager.
   * The WorkflowRunner passes the active IPersistenceProvider here so history reads
   * can be routed through it.
   */
  public async initialize(opts?: { host?: any; persistence?: IPersistenceProvider | null }): Promise<void> {
    if (this._isInitialized) {
      logger.warn('WorkflowLifecycleManager already initialized');
      return;
    }

    try {
      logger.info('Initializing WorkflowLifecycleManager');

      if (opts?.persistence !== undefined) {
        this.persistence = opts.persistence;
        logger.info(
          `WorkflowLifecycleManager: persistence provider set to ${this.persistence ? this.persistence.constructor?.name || 'custom' : 'none (in-memory)'}`
        );
      }

      // Start cleanup timer
      this.cleanupTimer = setInterval(() => {
        this.performCleanup();
      }, this.config.cleanupInterval);

      // Start status update timer
      this.statusUpdateTimer = setInterval(() => {
        this.updateWorkflowStatuses();
      }, this.config.statusUpdateInterval);

      this._isInitialized = true;
      logger.info('WorkflowLifecycleManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WorkflowLifecycleManager', error);
      throw error;
    }
  }

  /**
   * Set (or replace) the active persistence provider after initialization.
   * Used when the WorkflowRunner creates a new provider mid-lifecycle.
   */
  public setPersistence(provider: IPersistenceProvider | null): void {
    this.persistence = provider;
  }

  // ============================================
  // Provider-backed Persistence Methods (M9)
  // ============================================

  /**
   * Get paginated workflow history through the active IPersistenceProvider.
   * Returns empty results gracefully when no provider is configured.
   */
  public async getWorkflowHistory(
    filter?: IWorkflowHistoryFilter,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    if (!this.persistence) {
      logger.debug('getWorkflowHistory: no persistence provider — returning empty result');
      return this._emptyPaginatedHistory(pagination?.page ?? 1, pagination?.limit ?? 10);
    }

    try {
      const query = buildQuery(filter, pagination);
      const { instances, total } = await this.persistence.queryWorkflowInstances(query);

      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 10;
      const pages = Math.ceil(total / limit);

      return {
        instances: instances.map(transformToHistoryItem),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to get workflow history', error);
      throw error;
    }
  }

  /**
   * Get a single workflow instance by ID through the active provider.
   */
  public async getWorkflowHistoryById(instanceId: string): Promise<IWorkflowHistoryItem | null> {
    if (!this.persistence) {
      logger.debug(`getWorkflowHistoryById(${instanceId}): no persistence provider`);
      return null;
    }

    try {
      const instance = await this.persistence.getWorkflowInstance(instanceId);
      if (!instance) return null;
      return transformToHistoryItem(instance);
    } catch (error) {
      logger.error('Failed to get workflow history by ID', error);
      return null;
    }
  }

  /**
   * Get workflow instances by workflow definition ID.
   */
  public async getWorkflowHistoryByDefinitionId(
    workflowDefinitionId: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    return this.getWorkflowHistory({ workflowDefinitionId }, pagination);
  }

  /**
   * Get workflow instances by status.
   */
  public async getWorkflowHistoryByStatus(
    status: WorkflowESStatus | WorkflowESStatus[],
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    return this.getWorkflowHistory({ status }, pagination);
  }

  /**
   * Get workflow execution statistics through the active provider.
   */
  public async getWorkflowExecutionStats(): Promise<IWorkflowExecutionStats> {
    if (!this.persistence) {
      logger.debug('getWorkflowExecutionStats: no persistence provider — returning zero stats');
      return {
        total: 0,
        pending: 0,
        runnable: 0,
        complete: 0,
        terminated: 0,
        suspended: 0,
        averageCompletionTime: undefined,
        byWorkflowDefinition: [],
      };
    }

    try {
      const stats = await this.persistence.getWorkflowInstanceStats();

      // byStatus maps engine WorkflowStatus values:
      // 0=Runnable, 1=Suspended, 2=Complete, 3=Terminated, 4=DeadLettered
      const byStatus = stats.byStatus;

      return {
        total: stats.total,
        pending: (byStatus[0] ?? 0),    // Runnable → displayed as Pending/Running
        runnable: (byStatus[0] ?? 0),
        complete: (byStatus[2] ?? 0),
        terminated: (byStatus[3] ?? 0) + (byStatus[4] ?? 0), // include DeadLettered
        suspended: (byStatus[1] ?? 0),
        averageCompletionTime: stats.averageCompletionTimeMs ?? undefined,
        byWorkflowDefinition: stats.byDefinition.map(d => ({
          workflowDefinitionId: d.workflowDefinitionId,
          total: d.total,
          complete: d.complete,
          terminated: d.terminated,
        })),
      };
    } catch (error) {
      logger.error('Failed to get workflow execution stats', error);
      throw error;
    }
  }

  /**
   * Get counts of instances with failed execution pointers, grouped by workflow definition.
   */
  public async getInstancesWithFailedSteps(): Promise<Record<string, number>> {
    if (!this.persistence) {
      return {};
    }

    try {
      const stats = await this.persistence.getWorkflowInstanceStats();
      return stats.instancesWithFailedSteps;
    } catch (error) {
      logger.error('Failed to get instances with failed steps', error);
      return {};
    }
  }

  /**
   * Get error details for a specific workflow definition from execution history.
   * Returns failed execution pointers with contextual error information.
   */
  public async getWorkflowErrorDetails(
    workflowDefinitionId: string,
    limit: number = 10
  ): Promise<Array<{
    instanceId: string;
    createTime: Date;
    workflowStatus: number;
    workflowStatusLabel: string;
    failedSteps: Array<{
      stepId: number;
      status: number;
      statusLabel: string;
      startTime?: Date | null;
      endTime?: Date | null;
      retryCount: number;
      persistenceData?: any;
    }>;
  }>> {
    if (!this.persistence) {
      return [];
    }

    try {
      const { instances } = await this.persistence.queryWorkflowInstances({
        workflowDefinitionId,
        take: limit,
        sortField: 'createTime',
        sortOrder: 'desc',
      });

      return instances
        .filter(instance =>
          (instance.executionPointers || []).some(p => p.status === 6) // PointerStatus.Failed = 6
        )
        .map(instance => {
          const status = mapProviderStatus(instance.status);
          return {
            instanceId: instance.id,
            createTime: instance.createTime instanceof Date
              ? instance.createTime
              : new Date(instance.createTime as any),
            workflowStatus: instance.status,
            workflowStatusLabel: getStatusLabel(status),
            failedSteps: (instance.executionPointers || [])
              .filter(p => p.status === 6)
              .map(p => ({
                stepId: p.stepId,
                status: p.status,
                statusLabel: getExecutionPointerStatusLabel(mapPointerStatus(p.status)),
                startTime: p.startTime instanceof Date ? p.startTime : (p.startTime ? new Date(p.startTime as any) : null),
                endTime: p.endTime instanceof Date ? p.endTime : (p.endTime ? new Date(p.endTime as any) : null),
                retryCount: p.retryCount,
                persistenceData: p.persistenceData,
              })),
          };
        });
    } catch (error) {
      logger.error('Failed to get workflow error details', error);
      return [];
    }
  }

  /**
   * Search workflow history with text search.
   */
  public async searchWorkflowHistory(
    searchTerm: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    return this.getWorkflowHistory({ searchTerm }, pagination);
  }

  /**
   * Get recent workflow executions.
   */
  public async getRecentWorkflowExecutions(limit: number = 10): Promise<IWorkflowHistoryItem[]> {
    if (!this.persistence) {
      return [];
    }

    try {
      const { instances } = await this.persistence.queryWorkflowInstances({
        take: limit,
        sortField: 'createTime',
        sortOrder: 'desc',
      });

      return instances.map(transformToHistoryItem);
    } catch (error) {
      logger.error('Failed to get recent workflow executions', error);
      throw error;
    }
  }

  /**
   * Get workflow execution count by date range (time series).
   */
  public async getWorkflowExecutionCountByDate(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'hour' | 'week' = 'day'
  ): Promise<{ date: Date; count: number; complete: number; terminated: number }[]> {
    if (!this.persistence) {
      return [];
    }

    try {
      // M9 only specifies daily buckets; hour/week are approximated as daily
      const points = await this.persistence.getWorkflowInstanceTimeSeries({
        from: startDate,
        to: endDate,
      });

      return points.map(p => ({
        date: new Date(p.date),
        count: p.total,
        complete: p.complete,
        terminated: p.terminated,
      }));
    } catch (error) {
      logger.error('Failed to get workflow execution count by date', error);
      throw error;
    }
  }

  /**
   * Delete a single workflow execution history item by instance ID.
   */
  public async deleteWorkflowHistory(instanceId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    if (!this.persistence) {
      return { success: false, deletedCount: 0, message: 'No persistence provider configured' };
    }

    try {
      const deleted = await this.persistence.deleteWorkflowInstance(instanceId);

      if (!deleted) {
        return {
          success: false,
          deletedCount: 0,
          message: `Workflow instance ${instanceId} not found`,
        };
      }

      logger.info(`Deleted workflow execution history: ${instanceId}`);
      return {
        success: true,
        deletedCount: 1,
        message: `Successfully deleted workflow instance ${instanceId}`,
      };
    } catch (error) {
      logger.error('Failed to delete workflow execution history', error);
      throw error;
    }
  }

  /**
   * Delete multiple workflow execution history items by instance IDs.
   */
  public async deleteWorkflowHistoryBatch(instanceIds: string[]): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    if (!this.persistence) {
      return { success: false, deletedCount: 0, message: 'No persistence provider configured' };
    }

    if (!instanceIds || instanceIds.length === 0) {
      return { success: false, deletedCount: 0, message: 'No instance IDs provided' };
    }

    try {
      const deletedCount = await this.persistence.deleteWorkflowInstances(instanceIds);

      logger.info(`Deleted ${deletedCount} workflow execution history items`);
      return {
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} workflow instances`,
      };
    } catch (error) {
      logger.error('Failed to delete workflow execution history batch', error);
      throw error;
    }
  }

  /**
   * Clear all workflow execution history for a specific workflow definition.
   */
  public async clearWorkflowHistory(workflowDefinitionId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    if (!this.persistence) {
      return { success: false, deletedCount: 0, message: 'No persistence provider configured' };
    }

    if (!workflowDefinitionId) {
      return { success: false, deletedCount: 0, message: 'Workflow definition ID is required' };
    }

    try {
      const deletedCount = await this.persistence.deleteWorkflowInstancesByDefinitionId(workflowDefinitionId);

      logger.info(`Cleared ${deletedCount} workflow execution history items for ${workflowDefinitionId}`);
      return {
        success: true,
        deletedCount,
        message: `Successfully cleared ${deletedCount} workflow instances for ${workflowDefinitionId}`,
      };
    } catch (error) {
      logger.error('Failed to clear workflow execution history', error);
      throw error;
    }
  }

  // ============================================
  // In-Memory Workflow Management (Existing)
  // ============================================

  /**
   * Create a new workflow instance
   */
  public createWorkflowInstance(
    workflowId: string,
    version: string,
    priority: WorkflowPriority = WorkflowPriority.NORMAL,
    dependencies: IWorkflowDependency[] = [],
    metadata?: Record<string, any>
  ): IWorkflowInstance {
    const instanceId = this.generateInstanceId(workflowId);

    const instance: IWorkflowInstance = {
      id: instanceId,
      workflowId,
      version,
      status: WorkflowStatus.PENDING,
      priority,
      startedAt: new Date(),
      updatedAt: new Date(),
      metadata,
      dependencies: [],
      dependents: [],
      cleanupTasks: [],
      resourceUsage: {
        memory: 0,
        cpu: 0,
        disk: 0,
      },
    };

    this.workflows.set(instanceId, instance);
    this.dependencies.set(instanceId, dependencies);

    logger.info(`Created workflow instance: ${instanceId} (${workflowId}@${version})`);
    this.emit('workflowCreated', instance);

    return instance;
  }

  /**
   * Start a workflow instance
   */
  public async startWorkflow(instanceId: string): Promise<void> {
    const instance = this.workflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.PENDING) {
      throw new Error(`Cannot start workflow in ${instance.status} status`);
    }

    // Check dependencies
    await this.checkDependencies(instanceId);

    // Check resource availability
    await this.checkResourceAvailability();

    // Update status
    instance.status = WorkflowStatus.RUNNING;
    instance.updatedAt = new Date();

    logger.info(`Started workflow instance: ${instanceId}`);
    this.emit('workflowStarted', instance);
  }

  /**
   * Pause a workflow instance
   */
  public pauseWorkflow(instanceId: string): void {
    const instance = this.workflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.RUNNING) {
      throw new Error(`Cannot pause workflow in ${instance.status} status`);
    }

    instance.status = WorkflowStatus.PAUSED;
    instance.pausedAt = new Date();
    instance.updatedAt = new Date();

    logger.info(`Paused workflow instance: ${instanceId}`);
    this.emit('workflowPaused', instance);
  }

  /**
   * Resume a workflow instance
   */
  public resumeWorkflow(instanceId: string): void {
    const instance = this.workflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.PAUSED) {
      throw new Error(`Cannot resume workflow in ${instance.status} status`);
    }

    instance.status = WorkflowStatus.RUNNING;
    instance.resumedAt = new Date();
    instance.updatedAt = new Date();

    logger.info(`Resumed workflow instance: ${instanceId}`);
    this.emit('workflowResumed', instance);
  }

  /**
   * Complete a workflow instance
   */
  public completeWorkflow(instanceId: string, result?: any): void {
    const instance = this.workflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.RUNNING && instance.status !== WorkflowStatus.PAUSED) {
      throw new Error(`Cannot complete workflow in ${instance.status} status`);
    }

    instance.status = WorkflowStatus.COMPLETED;
    instance.completedAt = new Date();
    instance.updatedAt = new Date();
    if (result) {
      instance.metadata = { ...instance.metadata, result };
    }

    logger.info(`Completed workflow instance: ${instanceId}`);
    this.emit('workflowCompleted', instance);

    // Trigger dependent workflows
    this.triggerDependentWorkflows(instanceId);
  }

  /**
   * Fail a workflow instance
   */
  public failWorkflow(instanceId: string, error: Error): void {
    const instance = this.workflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    instance.status = WorkflowStatus.FAILED;
    instance.error = error;
    instance.updatedAt = new Date();

    logger.error(`Failed workflow instance: ${instanceId}`, error);
    this.emit('workflowFailed', instance, error);

    // Trigger dependent workflows (some may depend on failure)
    this.triggerDependentWorkflows(instanceId);
  }

  /**
   * Cancel a workflow instance
   */
  public cancelWorkflow(instanceId: string, reason?: string): void {
    const instance = this.workflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    instance.status = WorkflowStatus.CANCELLED;
    instance.cancelledAt = new Date();
    instance.updatedAt = new Date();
    if (reason) {
      instance.metadata = { ...instance.metadata, cancellationReason: reason };
    }

    logger.info(`Cancelled workflow instance: ${instanceId}`, { reason });
    this.emit('workflowCancelled', instance, reason);
  }

  /**
   * Get workflow instance by ID (in-memory)
   */
  public getWorkflowInstance(instanceId: string): IWorkflowInstance | undefined {
    return this.workflows.get(instanceId);
  }

  /**
   * Get all workflow instances (in-memory)
   */
  public getAllWorkflowInstances(): IWorkflowInstance[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get all instances for a specific workflow ID (in-memory)
   * @param workflowId The workflow ID (e.g., 'core.TestWorkflow@1.0.0')
   * @returns Array of workflow instances matching the workflow ID
   */
  public getInstancesByWorkflowId(workflowId: string): IWorkflowInstance[] {
    return Array.from(this.workflows.values()).filter(w => w.workflowId === workflowId);
  }

  /**
   * Get workflows by status (in-memory)
   */
  public getWorkflowsByStatus(status: WorkflowStatus): IWorkflowInstance[] {
    return Array.from(this.workflows.values()).filter(w => w.status === status);
  }

  /**
   * Get workflows by priority (in-memory)
   */
  public getWorkflowsByPriority(priority: WorkflowPriority): IWorkflowInstance[] {
    return Array.from(this.workflows.values()).filter(w => w.priority === priority);
  }

  /**
   * Add dependency between workflows
   */
  public addDependency(
    dependentId: string,
    dependencyId: string,
    condition: 'completed' | 'failed' | 'any' = 'completed',
    timeout?: number
  ): void {
    const dependent = this.workflows.get(dependentId);
    const dependency = this.workflows.get(dependencyId);

    if (!dependent) {
      throw new Error(`Dependent workflow not found: ${dependentId}`);
    }
    if (!dependency) {
      throw new Error(`Dependency workflow not found: ${dependencyId}`);
    }

    // Add to dependent's dependencies
    if (!dependent.dependencies.includes(dependencyId)) {
      dependent.dependencies.push(dependencyId);
    }

    // Add to dependency's dependents
    if (!dependency.dependents.includes(dependentId)) {
      dependency.dependents.push(dependentId);
    }

    // Update dependency configuration
    const deps = this.dependencies.get(dependentId) || [];
    deps.push({
      workflowId: dependency.workflowId,
      version: dependency.version,
      condition,
      timeout,
    });
    this.dependencies.set(dependentId, deps);

    logger.info(`Added dependency: ${dependentId} depends on ${dependencyId} (${condition})`);
  }

  /**
   * Remove dependency between workflows
   */
  public removeDependency(dependentId: string, dependencyId: string): void {
    const dependent = this.workflows.get(dependentId);
    const dependency = this.workflows.get(dependencyId);

    if (dependent) {
      dependent.dependencies = dependent.dependencies.filter(id => id !== dependencyId);
    }

    if (dependency) {
      dependency.dependents = dependency.dependents.filter(id => id !== dependentId);
    }

    // Remove from dependency configuration
    const deps = this.dependencies.get(dependentId);
    if (deps) {
      this.dependencies.set(
        dependentId,
        deps.filter(d => d.workflowId !== dependency?.workflowId)
      );
    }

    logger.info(`Removed dependency: ${dependentId} no longer depends on ${dependencyId}`);
  }

  /**
   * Get workflow statistics (in-memory)
   */
  public getStats(): IWorkflowLifecycleStats {
    const workflows = Array.from(this.workflows.values());
    const completedWorkflows = workflows.filter(w => w.status === WorkflowStatus.COMPLETED);

    const averageExecutionTime = completedWorkflows.length > 0
      ? completedWorkflows.reduce((sum, w) => {
          const duration = w.completedAt!.getTime() - w.startedAt.getTime();
          return sum + duration;
        }, 0) / completedWorkflows.length
      : 0;

    const resourceUtilization = this.calculateResourceUtilization();

    return {
      totalWorkflows: workflows.length,
      runningWorkflows: workflows.filter(w => w.status === WorkflowStatus.RUNNING).length,
      pausedWorkflows: workflows.filter(w => w.status === WorkflowStatus.PAUSED).length,
      completedWorkflows: completedWorkflows.length,
      failedWorkflows: workflows.filter(w => w.status === WorkflowStatus.FAILED).length,
      cancelledWorkflows: workflows.filter(w => w.status === WorkflowStatus.CANCELLED).length,
      averageExecutionTime,
      resourceUtilization,
      lastCleanupTime: new Date(),
    };
  }

  /**
   * Clean up completed/failed workflows (in-memory)
   */
  public async cleanup(): Promise<void> {
    logger.info('Starting workflow cleanup');

    const cutoffTime = new Date(Date.now() - this.config.maxWorkflowDuration);
    const workflowsToCleanup = Array.from(this.workflows.values()).filter(w => {
      return (
        (w.status === WorkflowStatus.COMPLETED || w.status === WorkflowStatus.FAILED || w.status === WorkflowStatus.CANCELLED) &&
        w.updatedAt < cutoffTime
      );
    });

    for (const workflow of workflowsToCleanup) {
      await this.cleanupWorkflow(workflow.id);
    }

    logger.info(`Cleaned up ${workflowsToCleanup.length} workflows`);
  }

  /**
   * Stop the lifecycle manager
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping WorkflowLifecycleManager');

      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }

      if (this.statusUpdateTimer) {
        clearInterval(this.statusUpdateTimer);
        this.statusUpdateTimer = undefined;
      }

      // Clean up all workflows
      await this.cleanup();

      this._isInitialized = false;
      logger.info('WorkflowLifecycleManager stopped');
    } catch (error) {
      logger.error('Failed to stop WorkflowLifecycleManager', error);
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  // Private methods

  private _emptyPaginatedHistory(page: number, limit: number): IPaginatedWorkflowHistory {
    return {
      instances: [],
      pagination: { page, limit, total: 0, pages: 0, hasNext: false, hasPrev: false },
    };
  }

  private generateInstanceId(workflowId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${workflowId}-${timestamp}-${random}`;
  }

  private async checkDependencies(instanceId: string): Promise<void> {
    const deps = this.dependencies.get(instanceId) || [];

    for (const dep of deps) {
      const dependencyInstance = Array.from(this.workflows.values()).find(
        w => w.workflowId === dep.workflowId && w.version === dep.version
      );

      if (!dependencyInstance) {
        throw new Error(`Dependency not found: ${dep.workflowId}@${dep.version}`);
      }

      const isSatisfied = this.isDependencySatisfied(dependencyInstance, dep.condition);
      if (!isSatisfied) {
        throw new Error(`Dependency not satisfied: ${dep.workflowId}@${dep.version} (${dep.condition})`);
      }
    }
  }

  private isDependencySatisfied(
    dependency: IWorkflowInstance,
    condition: 'completed' | 'failed' | 'any'
  ): boolean {
    switch (condition) {
      case 'completed':
        return dependency.status === WorkflowStatus.COMPLETED;
      case 'failed':
        return dependency.status === WorkflowStatus.FAILED;
      case 'any':
        return dependency.status === WorkflowStatus.COMPLETED || dependency.status === WorkflowStatus.FAILED;
      default:
        return false;
    }
  }

  private async checkResourceAvailability(): Promise<void> {
    const runningWorkflows = this.getWorkflowsByStatus(WorkflowStatus.RUNNING);

    if (runningWorkflows.length >= this.config.maxConcurrentWorkflows) {
      throw new Error(`Maximum concurrent workflows reached: ${this.config.maxConcurrentWorkflows}`);
    }

    const resourceUtilization = this.calculateResourceUtilization();

    if (resourceUtilization.memory > this.config.resourceThresholds.memory) {
      throw new Error(`Memory threshold exceeded: ${resourceUtilization.memory}MB > ${this.config.resourceThresholds.memory}MB`);
    }

    if (resourceUtilization.cpu > this.config.resourceThresholds.cpu) {
      throw new Error(`CPU threshold exceeded: ${resourceUtilization.cpu}% > ${this.config.resourceThresholds.cpu}%`);
    }

    if (resourceUtilization.disk > this.config.resourceThresholds.disk) {
      throw new Error(`Disk threshold exceeded: ${resourceUtilization.disk}MB > ${this.config.resourceThresholds.disk}MB`);
    }
  }

  private calculateResourceUtilization() {
    const runningWorkflows = this.getWorkflowsByStatus(WorkflowStatus.RUNNING);

    const totalMemory = runningWorkflows.reduce((sum, w) => sum + w.resourceUsage.memory, 0);
    const totalCpu = runningWorkflows.reduce((sum, w) => sum + w.resourceUsage.cpu, 0);
    const totalDisk = runningWorkflows.reduce((sum, w) => sum + w.resourceUsage.disk, 0);

    return {
      memory: totalMemory,
      cpu: totalCpu,
      disk: totalDisk,
    };
  }

  private triggerDependentWorkflows(instanceId: string): void {
    const instance = this.workflows.get(instanceId);
    if (!instance) return;

    for (const dependentId of instance.dependents) {
      const dependent = this.workflows.get(dependentId);
      if (dependent && dependent.status === WorkflowStatus.PENDING) {
        // Check if all dependencies are satisfied
        const deps = this.dependencies.get(dependentId) || [];
        const allDepsSatisfied = deps.every(dep => {
          const depInstance = Array.from(this.workflows.values()).find(
            w => w.workflowId === dep.workflowId && w.version === dep.version
          );
          return depInstance && this.isDependencySatisfied(depInstance, dep.condition);
        });

        if (allDepsSatisfied) {
          logger.info(`All dependencies satisfied for ${dependentId}, ready to start`);
          this.emit('workflowReady', dependent);
        }
      }
    }
  }

  private async cleanupWorkflow(instanceId: string): Promise<void> {
    const instance = this.workflows.get(instanceId);
    if (!instance) return;

    try {
      // Execute cleanup tasks
      for (const taskId of instance.cleanupTasks) {
        await this.executeCleanupTask(taskId, instance);
      }

      // Remove from tracking
      this.workflows.delete(instanceId);
      this.dependencies.delete(instanceId);

      logger.debug(`Cleaned up workflow instance: ${instanceId}`);
      this.emit('workflowCleanedUp', instance);
    } catch (error) {
      logger.error(`Failed to cleanup workflow instance: ${instanceId}`, error);
    }
  }

  private async executeCleanupTask(taskId: string, instance: IWorkflowInstance): Promise<void> {
    // This would be implemented based on specific cleanup requirements
    logger.debug(`Executing cleanup task: ${taskId} for workflow: ${instance.id}`);
  }

  private performCleanup(): void {
    this.cleanup().catch(error => {
      logger.error('Failed to perform cleanup', error);
    });
  }

  private updateWorkflowStatuses(): void {
    const runningWorkflows = this.getWorkflowsByStatus(WorkflowStatus.RUNNING);

    for (const workflow of runningWorkflows) {
      // Check for timeout
      const duration = Date.now() - workflow.startedAt.getTime();
      if (duration > this.config.maxWorkflowDuration) {
        logger.warn(`Workflow ${workflow.id} exceeded maximum duration, cancelling`);
        this.cancelWorkflow(workflow.id, 'Maximum duration exceeded');
      }

      // Update resource usage (simulated)
      this.updateResourceUsage(workflow);
    }
  }

  private updateResourceUsage(workflow: IWorkflowInstance): void {
    // Simulate resource usage updates
    workflow.resourceUsage = {
      memory: Math.random() * 100 + 50, // 50-150 MB
      cpu: Math.random() * 20 + 10, // 10-30%
      disk: Math.random() * 50 + 25, // 25-75 MB
    };
    workflow.updatedAt = new Date();
  }
}

// Re-export enums and helpers (no longer from models which had mongoose)
export {
  WorkflowESStatus,
  ExecutionPointerStatus,
  getStatusLabel,
  getExecutionPointerStatusLabel,
};
