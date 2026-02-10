import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Workflow-ES Status Enum
 * These values correspond to the workflow-es library's internal status codes
 */
export enum WorkflowESStatus {
  PENDING = 0,
  RUNNABLE = 1,
  COMPLETE = 2,
  TERMINATED = 3,
  SUSPENDED = 4,
}

/**
 * Execution Pointer Status Enum
 * Status values for individual step execution pointers
 */
export enum ExecutionPointerStatus {
  LEGACY = 0,
  PENDING = 1,
  RUNNING = 2,
  COMPLETE = 3,
  SLEEPING = 4,
  WAITING_FOR_EVENT = 5,
  FAILED = 6,
  COMPENSATED = 7,
  CANCELLED = 8,
}

/**
 * Interface for Execution Pointer subdocument
 */
export interface IExecutionPointer {
  id: string;
  stepId: number;
  active: boolean;
  sleepUntil?: Date | null;
  persistenceData?: any;
  startTime?: Date | null;
  endTime?: Date | null;
  eventName?: string | null;
  eventKey?: string | null;
  eventPublished: boolean;
  eventData?: any;
  retryCount: number;
  children: string[];
  contextItem?: any;
  predecessorId?: string | null;
  outcome?: any;
  status: ExecutionPointerStatus;
  scope: string[];
}

/**
 * Interface for the Workflow Instance document
 * This matches the schema used by workflow-es MongoDB persistence
 */
export interface IWorkflowInstanceDocument extends Document {
  id: string;
  workflowDefinitionId: string;
  version: number;
  description?: string | null;
  reference?: string | null;
  nextExecution?: number | null;
  status: WorkflowESStatus;
  data: Record<string, any>;
  createTime: Date;
  completeTime?: Date | null;
  executionPointers: IExecutionPointer[];
}

/**
 * Interface for query filter options
 */
export interface IWorkflowInstanceFilter {
  workflowDefinitionId?: string;
  status?: WorkflowESStatus | WorkflowESStatus[];
  createdAfter?: Date;
  createdBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
  searchTerm?: string;
}

/**
 * Interface for pagination options
 */
export interface IWorkflowInstancePagination {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for paginated results
 */
export interface IPaginatedWorkflowInstances {
  instances: IWorkflowInstanceDocument[];
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
 * Static methods interface for the model
 */
export interface IWorkflowInstanceModel extends Model<IWorkflowInstanceDocument> {
  findByWorkflowDefinitionId(workflowDefinitionId: string): Promise<IWorkflowInstanceDocument[]>;
  findByStatus(status: WorkflowESStatus | WorkflowESStatus[]): Promise<IWorkflowInstanceDocument[]>;
  findPaginated(
    filter?: IWorkflowInstanceFilter,
    pagination?: IWorkflowInstancePagination
  ): Promise<IPaginatedWorkflowInstances>;
  getWorkflowStats(): Promise<{
    total: number;
    pending: number;
    runnable: number;
    complete: number;
    terminated: number;
    suspended: number;
  }>;
}

/**
 * Execution Pointer Schema
 */
const ExecutionPointerSchema = new Schema<IExecutionPointer>({
  id: { type: String, required: true },
  stepId: { type: Number, required: true },
  active: { type: Boolean, default: false },
  sleepUntil: { type: Date, default: null },
  persistenceData: { type: Schema.Types.Mixed, default: null },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  eventName: { type: String, default: null },
  eventKey: { type: String, default: null },
  eventPublished: { type: Boolean, default: false },
  eventData: { type: Schema.Types.Mixed, default: null },
  retryCount: { type: Number, default: 0 },
  children: { type: [String], default: [] },
  contextItem: { type: Schema.Types.Mixed, default: null },
  predecessorId: { type: String, default: null },
  outcome: { type: Schema.Types.Mixed, default: null },
  status: { type: Number, default: ExecutionPointerStatus.PENDING },
  scope: { type: [String], default: [] },
}, { _id: false });

/**
 * Workflow Instance Schema
 * This schema matches the structure used by workflow-es MongoDB persistence
 */
const WorkflowInstanceSchema = new Schema<IWorkflowInstanceDocument, IWorkflowInstanceModel>({
  id: { 
    type: String, 
    required: true, 
    index: true,
  },
  workflowDefinitionId: { 
    type: String, 
    required: true, 
    index: true,
  },
  version: { 
    type: Number, 
    required: true,
    default: 1,
  },
  description: { 
    type: String, 
    default: null,
  },
  reference: {
    type: String,
    default: null,
    index: true,
  },
  nextExecution: { 
    type: Number, 
    default: null,
    index: true,
  },
  status: { 
    type: Number, 
    required: true,
    default: WorkflowESStatus.PENDING,
    index: true,
  },
  data: { 
    type: Schema.Types.Mixed, 
    default: {},
  },
  createTime: { 
    type: Date, 
    required: true,
    default: Date.now,
    index: true,
  },
  completeTime: { 
    type: Date, 
    default: null,
    index: true,
  },
  executionPointers: {
    type: [ExecutionPointerSchema],
    default: [],
  },
}, {
  timestamps: false, // workflow-es manages its own timestamps
  collection: 'workflows', // The collection name used by workflow-es
});

// Compound indexes for common queries
WorkflowInstanceSchema.index({ workflowDefinitionId: 1, status: 1 });
WorkflowInstanceSchema.index({ workflowDefinitionId: 1, createTime: -1 });
WorkflowInstanceSchema.index({ status: 1, createTime: -1 });

/**
 * Static method: Find by workflow definition ID
 */
WorkflowInstanceSchema.statics.findByWorkflowDefinitionId = async function(
  workflowDefinitionId: string
): Promise<IWorkflowInstanceDocument[]> {
  return this.find({ workflowDefinitionId }).sort({ createTime: -1 }).exec();
};

/**
 * Static method: Find by status
 */
WorkflowInstanceSchema.statics.findByStatus = async function(
  status: WorkflowESStatus | WorkflowESStatus[]
): Promise<IWorkflowInstanceDocument[]> {
  const statusFilter = Array.isArray(status) ? { $in: status } : status;
  return this.find({ status: statusFilter }).sort({ createTime: -1 }).exec();
};

/**
 * Static method: Find paginated with filters
 */
WorkflowInstanceSchema.statics.findPaginated = async function(
  filter: IWorkflowInstanceFilter = {},
  pagination: IWorkflowInstancePagination = {}
): Promise<IPaginatedWorkflowInstances> {
  const {
    page = 1,
    limit = 10,
    sortField = 'createTime',
    sortOrder = 'desc',
  } = pagination;

  // Build the query filter
  const query: any = {};

  if (filter.workflowDefinitionId) {
    // Support partial matching with regex
    if (filter.workflowDefinitionId.includes('*')) {
      query.workflowDefinitionId = {
        $regex: filter.workflowDefinitionId.replace(/\*/g, '.*'),
        $options: 'i',
      };
    } else {
      query.workflowDefinitionId = filter.workflowDefinitionId;
    }
  }

  if (filter.status !== undefined) {
    query.status = Array.isArray(filter.status) 
      ? { $in: filter.status } 
      : filter.status;
  }

  if (filter.createdAfter || filter.createdBefore) {
    query.createTime = {};
    if (filter.createdAfter) {
      query.createTime.$gte = filter.createdAfter;
    }
    if (filter.createdBefore) {
      query.createTime.$lte = filter.createdBefore;
    }
  }

  if (filter.completedAfter || filter.completedBefore) {
    query.completeTime = {};
    if (filter.completedAfter) {
      query.completeTime.$gte = filter.completedAfter;
    }
    if (filter.completedBefore) {
      query.completeTime.$lte = filter.completedBefore;
    }
  }

  if (filter.searchTerm) {
    query.$or = [
      { workflowDefinitionId: { $regex: filter.searchTerm, $options: 'i' } },
      { description: { $regex: filter.searchTerm, $options: 'i' } },
      { id: { $regex: filter.searchTerm, $options: 'i' } },
    ];
  }

  // Calculate skip and sort
  const skip = (page - 1) * limit;
  const sort: any = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

  // Execute the query with pagination
  const [instances, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit).exec(),
    this.countDocuments(query).exec(),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    instances,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Static method: Get workflow statistics
 */
WorkflowInstanceSchema.statics.getWorkflowStats = async function(): Promise<{
  total: number;
  pending: number;
  runnable: number;
  complete: number;
  terminated: number;
  suspended: number;
}> {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]).exec();

  const result = {
    total: 0,
    pending: 0,
    runnable: 0,
    complete: 0,
    terminated: 0,
    suspended: 0,
  };

  for (const stat of stats) {
    result.total += stat.count;
    switch (stat._id) {
      case WorkflowESStatus.PENDING:
        result.pending = stat.count;
        break;
      case WorkflowESStatus.RUNNABLE:
        result.runnable = stat.count;
        break;
      case WorkflowESStatus.COMPLETE:
        result.complete = stat.count;
        break;
      case WorkflowESStatus.TERMINATED:
        result.terminated = stat.count;
        break;
      case WorkflowESStatus.SUSPENDED:
        result.suspended = stat.count;
        break;
    }
  }

  return result;
};

/**
 * Helper function to map WorkflowESStatus to human-readable string
 */
export function getStatusLabel(status: WorkflowESStatus): string {
  switch (status) {
    case WorkflowESStatus.PENDING:
      return 'Pending';
    case WorkflowESStatus.RUNNABLE:
      return 'Running';
    case WorkflowESStatus.COMPLETE:
      return 'Complete';
    case WorkflowESStatus.TERMINATED:
      return 'Terminated';
    case WorkflowESStatus.SUSPENDED:
      return 'Suspended';
    default:
      return 'Unknown';
  }
}

/**
 * Helper function to get execution pointer status label
 */
export function getExecutionPointerStatusLabel(status: ExecutionPointerStatus): string {
  switch (status) {
    case ExecutionPointerStatus.LEGACY:
      return 'Legacy';
    case ExecutionPointerStatus.PENDING:
      return 'Pending';
    case ExecutionPointerStatus.RUNNING:
      return 'Running';
    case ExecutionPointerStatus.COMPLETE:
      return 'Complete';
    case ExecutionPointerStatus.SLEEPING:
      return 'Sleeping';
    case ExecutionPointerStatus.WAITING_FOR_EVENT:
      return 'Waiting for Event';
    case ExecutionPointerStatus.FAILED:
      return 'Failed';
    case ExecutionPointerStatus.COMPENSATED:
      return 'Compensated';
    case ExecutionPointerStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

// Create and export the model
// Note: We use mongoose.models to check if the model already exists to prevent re-compilation errors
const WorkflowInstanceModel = (mongoose.models.WorkflowInstance as IWorkflowInstanceModel) || 
  mongoose.model<IWorkflowInstanceDocument, IWorkflowInstanceModel>('WorkflowInstance', WorkflowInstanceSchema);

export default WorkflowInstanceModel;
