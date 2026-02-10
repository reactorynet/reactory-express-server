import logger from '../../../../logging';
import { EventEmitter } from 'events';
import {
  WorkflowInstanceModel,
  WorkflowESStatus,
  ExecutionPointerStatus,
  getStatusLabel,
  getExecutionPointerStatusLabel,
  type IWorkflowInstanceDocument,
  type IWorkflowInstanceFilter,
  type IWorkflowInstancePagination,
  type IPaginatedWorkflowInstances,
  type IExecutionPointer,
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
 * Interface for a workflow history item (transformed from MongoDB document)
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
 * Interface for execution pointer summary
 */
export interface IExecutionPointerSummary {
  id: string;
  stepId: number;
  status: ExecutionPointerStatus;
  statusLabel: string;
  startTime?: Date | null;
  endTime?: Date | null;
  duration?: number | null;
  retryCount: number;
  active: boolean;
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

export class WorkflowLifecycleManager extends EventEmitter {
  private workflows: Map<string, IWorkflowInstance> = new Map();
  private dependencies: Map<string, IWorkflowDependency[]> = new Map();
  private config: IWorkflowLifecycleConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private statusUpdateTimer?: NodeJS.Timeout;
  private _isInitialized: boolean = false;

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
   * Initialize the lifecycle manager
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      logger.warn('WorkflowLifecycleManager already initialized');
      return;
    }

    try {
      logger.info('Initializing WorkflowLifecycleManager');

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

  // ============================================
  // MongoDB Persistence Methods (New)
  // ============================================

  /**
   * Get paginated workflow history from MongoDB
   * @param filter - Filter options
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  public async getWorkflowHistory(
    filter?: IWorkflowHistoryFilter,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const mongoFilter: IWorkflowInstanceFilter = {};
      
      if (filter?.workflowDefinitionId) {
        mongoFilter.workflowDefinitionId = filter.workflowDefinitionId;
      }
      if (filter?.status !== undefined) {
        mongoFilter.status = filter.status;
      }
      if (filter?.createdAfter) {
        mongoFilter.createdAfter = filter.createdAfter;
      }
      if (filter?.createdBefore) {
        mongoFilter.createdBefore = filter.createdBefore;
      }
      if (filter?.completedAfter) {
        mongoFilter.completedAfter = filter.completedAfter;
      }
      if (filter?.completedBefore) {
        mongoFilter.completedBefore = filter.completedBefore;
      }
      if (filter?.searchTerm) {
        mongoFilter.searchTerm = filter.searchTerm;
      }

      const mongoPagination: IWorkflowInstancePagination = {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        sortField: pagination?.sortField || 'createTime',
        sortOrder: pagination?.sortOrder || 'desc',
      };

      const result = await WorkflowInstanceModel.findPaginated(mongoFilter, mongoPagination);

      // Transform the MongoDB documents to workflow history items
      const instances = result.instances.map((doc: IWorkflowInstanceDocument) => this.transformToHistoryItem(doc));

      return {
        instances,
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error('Failed to get workflow history', error);
      throw error;
    }
  }

  /**
   * Get a single workflow instance by ID from MongoDB
   * @param instanceId - The workflow instance ID
   * @returns The workflow history item or null if not found
   */
  public async getWorkflowHistoryById(instanceId: string): Promise<IWorkflowHistoryItem | null> {
    try {
      const doc = await WorkflowInstanceModel.findOne({ id: instanceId }).exec();
      
      if (!doc) {
        return null;
      }

      return this.transformToHistoryItem(doc);
    } catch (error) {
      logger.error('Failed to get workflow history by ID', error);
      throw error;
    }
  }

  /**
   * Get workflow instances by workflow definition ID from MongoDB
   * @param workflowDefinitionId - The workflow definition ID (e.g., 'core.CleanCacheWorkflow@1.0.0')
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  public async getWorkflowHistoryByDefinitionId(
    workflowDefinitionId: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    return this.getWorkflowHistory({ workflowDefinitionId }, pagination);
  }

  /**
   * Get workflow instances by status from MongoDB
   * @param status - The status or array of statuses to filter by
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  public async getWorkflowHistoryByStatus(
    status: WorkflowESStatus | WorkflowESStatus[],
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    return this.getWorkflowHistory({ status }, pagination);
  }

  /**
   * Get workflow execution statistics from MongoDB
   * @returns Workflow execution statistics
   */
  public async getWorkflowExecutionStats(): Promise<IWorkflowExecutionStats> {
    try {
      const basicStats = await WorkflowInstanceModel.getWorkflowStats();

      // Get average completion time for completed workflows
      const completionTimeStats = await WorkflowInstanceModel.aggregate([
        {
          $match: {
            status: WorkflowESStatus.COMPLETE,
            completeTime: { $ne: null },
          },
        },
        {
          $project: {
            duration: {
              $subtract: ['$completeTime', '$createTime'],
            },
          },
        },
        {
          $group: {
            _id: null,
            averageCompletionTime: { $avg: '$duration' },
          },
        },
      ]).exec();

      // Get stats by workflow definition
      const byWorkflowDefinition = await WorkflowInstanceModel.aggregate([
        {
          $group: {
            _id: '$workflowDefinitionId',
            total: { $sum: 1 },
            complete: {
              $sum: {
                $cond: [{ $eq: ['$status', WorkflowESStatus.COMPLETE] }, 1, 0],
              },
            },
            terminated: {
              $sum: {
                $cond: [{ $eq: ['$status', WorkflowESStatus.TERMINATED] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            workflowDefinitionId: '$_id',
            total: 1,
            complete: 1,
            terminated: 1,
          },
        },
        {
          $sort: { total: -1 },
        },
        {
          $limit: 20, // Top 20 workflow definitions
        },
      ]).exec();

      return {
        ...basicStats,
        averageCompletionTime: completionTimeStats[0]?.averageCompletionTime || undefined,
        byWorkflowDefinition,
      };
    } catch (error) {
      logger.error('Failed to get workflow execution stats', error);
      throw error;
    }
  }

  /**
   * Search workflow history with text search
   * @param searchTerm - The search term
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  public async searchWorkflowHistory(
    searchTerm: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    return this.getWorkflowHistory({ searchTerm }, pagination);
  }

  /**
   * Get recent workflow executions
   * @param limit - Maximum number of results
   * @returns Array of recent workflow history items
   */
  public async getRecentWorkflowExecutions(limit: number = 10): Promise<IWorkflowHistoryItem[]> {
    try {
      const docs = await WorkflowInstanceModel
        .find()
        .sort({ createTime: -1 })
        .limit(limit)
        .exec();

      return docs.map((doc: IWorkflowInstanceDocument) => this.transformToHistoryItem(doc));
    } catch (error) {
      logger.error('Failed to get recent workflow executions', error);
      throw error;
    }
  }

  /**
   * Get workflow execution count by date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param groupBy - Group by 'day' | 'hour' | 'week'
   * @returns Array of execution counts grouped by time
   */
  public async getWorkflowExecutionCountByDate(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'hour' | 'week' = 'day'
  ): Promise<{ date: Date; count: number; complete: number; terminated: number }[]> {
    try {
      let dateFormat: string;
      switch (groupBy) {
        case 'hour':
          dateFormat = '%Y-%m-%dT%H:00:00.000Z';
          break;
        case 'week':
          dateFormat = '%Y-W%V';
          break;
        case 'day':
        default:
          dateFormat = '%Y-%m-%d';
      }

      const results = await WorkflowInstanceModel.aggregate([
        {
          $match: {
            createTime: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createTime',
              },
            },
            count: { $sum: 1 },
            complete: {
              $sum: {
                $cond: [{ $eq: ['$status', WorkflowESStatus.COMPLETE] }, 1, 0],
              },
            },
            terminated: {
              $sum: {
                $cond: [{ $eq: ['$status', WorkflowESStatus.TERMINATED] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]).exec();

      return results.map((r: { _id: string; count: number; complete: number; terminated: number }) => ({
        date: new Date(r._id),
        count: r.count,
        complete: r.complete,
        terminated: r.terminated,
      }));
    } catch (error) {
      logger.error('Failed to get workflow execution count by date', error);
      throw error;
    }
  }

  /**
   * Delete a single workflow execution history item by instance ID
   * @param instanceId - The workflow instance ID to delete
   * @returns Object indicating success and number of deleted items
   */
  public async deleteWorkflowHistory(instanceId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    try {
      const result = await WorkflowInstanceModel.deleteOne({ id: instanceId }).exec();
      
      const deletedCount = result.deletedCount || 0;
      
      if (deletedCount === 0) {
        return {
          success: false,
          deletedCount: 0,
          message: `Workflow instance ${instanceId} not found`
        };
      }

      logger.info(`Deleted workflow execution history: ${instanceId}`);
      return {
        success: true,
        deletedCount,
        message: `Successfully deleted workflow instance ${instanceId}`
      };
    } catch (error) {
      logger.error('Failed to delete workflow execution history', error);
      throw error;
    }
  }

  /**
   * Delete multiple workflow execution history items by instance IDs
   * @param instanceIds - Array of workflow instance IDs to delete
   * @returns Object indicating success and number of deleted items
   */
  public async deleteWorkflowHistoryBatch(instanceIds: string[]): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    try {
      if (!instanceIds || instanceIds.length === 0) {
        return {
          success: false,
          deletedCount: 0,
          message: 'No instance IDs provided'
        };
      }

      const result = await WorkflowInstanceModel.deleteMany({ id: { $in: instanceIds } }).exec();
      
      const deletedCount = result.deletedCount || 0;

      logger.info(`Deleted ${deletedCount} workflow execution history items`);
      return {
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} workflow instances`
      };
    } catch (error) {
      logger.error('Failed to delete workflow execution history batch', error);
      throw error;
    }
  }

  /**
   * Clear all workflow execution history for a specific workflow definition
   * @param workflowDefinitionId - The workflow definition ID (e.g., 'core.CleanCacheWorkflow@1.0.0')
   * @returns Object indicating success and number of deleted items
   */
  public async clearWorkflowHistory(workflowDefinitionId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    try {
      if (!workflowDefinitionId) {
        return {
          success: false,
          deletedCount: 0,
          message: 'Workflow definition ID is required'
        };
      }

      const result = await WorkflowInstanceModel.deleteMany({ workflowDefinitionId }).exec();
      
      const deletedCount = result.deletedCount || 0;

      logger.info(`Cleared ${deletedCount} workflow execution history items for ${workflowDefinitionId}`);
      return {
        success: true,
        deletedCount,
        message: `Successfully cleared ${deletedCount} workflow instances for ${workflowDefinitionId}`
      };
    } catch (error) {
      logger.error('Failed to clear workflow execution history', error);
      throw error;
    }
  }

  /**
   * Transform a MongoDB document to a workflow history item
   */
  private transformToHistoryItem(doc: IWorkflowInstanceDocument): IWorkflowHistoryItem {
    const duration = doc.completeTime && doc.createTime
      ? doc.completeTime.getTime() - doc.createTime.getTime()
      : null;

    const executionPointers: IExecutionPointerSummary[] = (doc.executionPointers || []).map(pointer => {
      const pointerDuration = pointer.endTime && pointer.startTime
        ? pointer.endTime.getTime() - pointer.startTime.getTime()
        : null;

      return {
        id: pointer.id,
        stepId: pointer.stepId,
        status: pointer.status,
        statusLabel: getExecutionPointerStatusLabel(pointer.status),
        startTime: pointer.startTime,
        endTime: pointer.endTime,
        duration: pointerDuration,
        retryCount: pointer.retryCount,
        active: pointer.active,
      };
    });

    const completedStepCount = executionPointers.filter(
      p => p.status === ExecutionPointerStatus.COMPLETE
    ).length;

    const failedStepCount = executionPointers.filter(
      p => p.status === ExecutionPointerStatus.FAILED
    ).length;

    return {
      id: doc.id,
      workflowDefinitionId: doc.workflowDefinitionId,
      version: doc.version,
      status: doc.status,
      statusLabel: getStatusLabel(doc.status),
      description: doc.description,
      createTime: doc.createTime,
      completeTime: doc.completeTime,
      duration,
      data: doc.data,
      executionPointers,
      stepCount: executionPointers.length,
      completedStepCount,
      failedStepCount,
    };
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
    // In a real implementation, this would query actual resource usage
    workflow.resourceUsage = {
      memory: Math.random() * 100 + 50, // 50-150 MB
      cpu: Math.random() * 20 + 10, // 10-30%
      disk: Math.random() * 50 + 25, // 25-75 MB
    };
    workflow.updatedAt = new Date();
  }
}

// Re-export types and helpers from models
export {
  WorkflowESStatus,
  ExecutionPointerStatus,
  getStatusLabel,
  getExecutionPointerStatusLabel,
  WorkflowInstanceModel,
  type IWorkflowInstanceDocument,
  type IWorkflowInstanceFilter,
  type IWorkflowInstancePagination,
  type IPaginatedWorkflowInstances,
  type IExecutionPointer,
};
