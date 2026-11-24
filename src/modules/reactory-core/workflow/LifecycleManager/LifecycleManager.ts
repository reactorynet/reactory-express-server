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
import {
  describeTerminationForStatus,
  hasUnresolvedSalvage,
  isEngineTerminalStatus,
  isTerminationReasonStatus,
  readLastActivity,
  readReportedWorktree,
  readSalvageRecord,
  readTerminationReason,
  toDateOrNull,
  type ITerminationReasonDto,
  type IWorkflowSalvageRecord,
} from '../termination/TerminationReason';
import { UnresolvedSalvageError } from '../termination/TerminationRecorder';

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
  /** Event correlation key the step is waiting on (used to publish/signal the event). */
  eventKey?: string | null;
  /** Whether the awaited event has already been published/consumed. */
  eventPublished?: boolean;
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
  /**
   * The tenant the instance was started under (the Reactory client key), or null
   * for the engine's default tenant. Required to publish an event that can wake a
   * suspended step: the engine matches event subscriptions by tenant, so a publish
   * to the wrong tenant is silently dropped.
   */
  tenantId?: string | null;
  /** M11 — semantic version string, verbatim from the engine instance. */
  version: string;
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
  /**
   * WHY the instance was TERMINATED.
   *
   * Non-null for EVERY terminated row (status 3, and status 4 "DeadLettered"
   * which is displayed as TERMINATED): an unattributed row is reported as
   * `unknown` with an explanatory message rather than as silence — see
   * `describeTerminationForStatus`. Null while the instance is live AND for
   * COMPLETE instances: a successful run has no termination reason, so
   * `terminationReason != null` is a reliable filter for "this run did not
   * finish".
   */
  terminationReason?: ITerminationReasonDto | null;
  /**
   * The last moment the ENGINE made progress (newest of the persisted heartbeat,
   * every pointer start/end time, and `createTime`).
   *
   * Compare with wall-clock `now`: a run whose `lastActivity` is hours old while
   * files are still being written is exactly the "engine lost track while the
   * agent kept working" case from the incident — `completedStepCount` alone could
   * not express it.
   */
  lastActivity?: Date | null;
  /** Unpublished work left behind by a terminated run, when one was recorded. */
  salvage?: IWorkflowSalvageRecord | null;
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

/**
 * One provider scan, split into the two views callers actually want.
 *
 * Both halves come from the SAME `getWorkflowInstanceStats()` call - they were
 * previously fetched independently, which doubled the cost of every registry
 * read.
 */
export interface IInstanceStatsSnapshot {
  stats: IWorkflowExecutionStats;
  /** workflowDefinitionId -> count of non-terminated instances with failed pointers. */
  instancesWithFailedSteps: Record<string, number>;
  fetchedAt: Date;
}

/** Zeroed snapshot used when no persistence provider is configured. */
export function emptyInstanceStatsSnapshot(): IInstanceStatsSnapshot {
  return {
    stats: {
      total: 0,
      pending: 0,
      runnable: 0,
      complete: 0,
      terminated: 0,
      suspended: 0,
      averageCompletionTime: undefined,
      byWorkflowDefinition: [],
    },
    instancesWithFailedSteps: {},
    fetchedAt: new Date(),
  };
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
  const isTerminal = isEngineTerminalStatus(instance.status);

  const createTime = instance.createTime instanceof Date
    ? instance.createTime
    : new Date(instance.createTime as any);

  const lastActivity = readLastActivity(instance);

  // `completeTime` is NULL on several terminal paths in the engine today:
  //   - WorkflowHost.terminateWorkflow() only sets status = Terminated;
  //   - the dead-letter paths only set status = DeadLettered;
  //   - onError(Terminate) only sets status = Terminated.
  // Nothing set completeTime on those paths, which is why four of six recent
  // terminated instances had completeTime: null and duration: null. New writes
  // set it (WorkflowInstanceLifecycleRecorder.recordTermination); for the rows
  // that predate the fix, and for any path we have not reached yet, derive it
  // from the last engine activity so duration and every "never finished" query
  // stay meaningful. A terminal instance IS finished.
  const recordedCompleteTime = toDateOrNull(instance.completeTime);
  const completeTime = recordedCompleteTime || (isTerminal ? (lastActivity || createTime) : null);

  const duration = completeTime && createTime
    ? completeTime.getTime() - createTime.getTime()
    : null;

  // Termination reason: a recorded cause wins; otherwise a TERMINATED row gets an
  // explicit `unknown` (recorded: false) instead of silence.
  //
  // Deliberately gated on `isTerminationReasonStatus` (3/4), NOT on
  // `isEngineTerminalStatus` (2/3/4): a successful run has no "why did it not
  // finish", and synthesising one made 100% of COMPLETE rows claim "the process
  // may have died" — which also destroyed the field's use as a filter. A stale
  // recorded reason on a COMPLETE row (written by a drain that ran while the run
  // was live, before the engine resumed it) is likewise not surfaced: the run
  // did complete, so there is nothing to explain.
  const recordedReason = readTerminationReason(instance);
  const terminationReason: ITerminationReasonDto | null = isTerminationReasonStatus(instance.status)
    ? (recordedReason
      ? {
        code: recordedReason.code,
        message: recordedReason.message,
        time: recordedReason.time,
        source: recordedReason.source || 'derived',
        recorded: true,
      }
      : describeTerminationForStatus(instance.status, completeTime, lastActivity, createTime))
    : null;

  const salvage = readSalvageRecord(instance);

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
      eventKey: (pointer as any).eventKey || null,
      eventPublished: (pointer as any).eventPublished ?? false,
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
    tenantId: (instance as any).tenantId ?? null,
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
    terminationReason,
    lastActivity,
    salvage,
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

  /**
   * Hook that lets the guard CAPTURE a missing salvage record before deciding.
   *
   * WHY: auto-capture used to run only from the in-memory YAML finalize watch, so
   * a run started by a PREVIOUS process (the live incident's exact case), a
   * DeadLettered row, or a code workflow never got a record — and therefore had
   * no protection at all when someone cleared its history.
   *
   * The guard is the right place to close that: it always re-reads persisted
   * state, and the workflow's own `data.__reactory.worktree` survives the process.
   * So before answering "is this row blocked?", try to derive a record from the
   * persisted instance. Set by WorkflowRunner to
   * `terminationRecorder.captureSalvageForTerminatedInstance`.
   */
  /**
   * Optional hook that derives a salvage record from a row's own persisted
   * worktree facts (installed by WorkflowRunner as
   * `rec.captureSalvageForTerminatedInstance`).
   *
   * It receives the row the caller already holds, so it can skip its own read
   * (review R1 on REACTORY-302016408/20261103/4082245933).
   */
  private salvageCaptureHook:
    | ((instanceId: string, instance?: WorkflowInstance | null) => Promise<unknown>)
    | null = null;

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

  /**
   * Install the salvage-capture hook (see the field comment).
   *
   * Without it the guards still work for records that already exist; with it they
   * can also derive one from a persisted `data.__reactory.worktree`, which is what
   * protects runs this process never started.
   */
  public setSalvageCaptureHook(
    hook: ((instanceId: string, instance?: WorkflowInstance | null) => Promise<unknown>) | null,
  ): void {
    this.salvageCaptureHook = hook;
  }

  /**
   * Try to derive a salvage record for an instance from its persisted data.
   * Best-effort: never throws, never blocks the caller's decision.
   *
   * Returns the hook's record (or null) so the caller does NOT need a second
   * read to see what the capture produced.
   */
  private async attemptSalvageCapture(
    instanceId: string,
    instance?: WorkflowInstance | null,
  ): Promise<IWorkflowSalvageRecord | null> {
    if (!this.salvageCaptureHook || !instanceId) return null;
    try {
      const captured = await this.salvageCaptureHook(instanceId, instance);
      return (captured as IWorkflowSalvageRecord) || null;
    } catch (error) {
      logger.debug(`Salvage capture attempt failed for ${instanceId} (non-fatal)`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
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
   * Guard for destructive cleanup of a terminated run's artefacts.
   *
   * A terminated run that left a dirty worktree with unpublishable work must not
   * be silently discarded. The engine deliberately knows nothing about `git`:
   * whoever owns the worktree records it with
   * `WorkflowRunner.recordWorktreeSalvage()` (path, branch, HEAD, dirty flag) and
   * cleanup code calls this guard before removing anything. Retention/delete are
   * guarded too (`deleteWorkflowHistory`, `sweepExpiredInstances`), so the record
   * cannot be destroyed by an automated sweep either.
   *
   * @throws UnresolvedSalvageError when the run owes salvage work.
   * @returns the record, or null when none was ever written.
   */
  public async assertSalvageClear(instanceId: string): Promise<IWorkflowSalvageRecord | null> {
    if (!this.persistence || !instanceId) return null;

    let instance: WorkflowInstance | null = null;
    try {
      instance = await this.persistence.getWorkflowInstance(instanceId);
    } catch (error) {
      logger.warn(`assertSalvageClear(${instanceId}): failed to load instance`, error);
      return null;
    }

    let record = readSalvageRecord(instance);

    // Same capture attempt as the other guards: a run whose record was never
    // written (previous process, DeadLettered, code workflow) is still protected
    // as long as its persisted data reports a worktree.
    if (!hasUnresolvedSalvage(record)) {
      await this.attemptSalvageCapture(instanceId);
      try {
        const refreshed = await this.persistence.getWorkflowInstance(instanceId);
        record = readSalvageRecord(refreshed) || record;
      } catch {
        /* keep the original answer */
      }
    }

    if (hasUnresolvedSalvage(record)) {
      throw new UnresolvedSalvageError(instanceId, record as IWorkflowSalvageRecord);
    }
    return record;
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

  // ── Instance-stats snapshot ────────────────────────────────────────────────
  //
  // getWorkflowInstanceStats() is the most expensive read in the platform: it
  // runs four aggregations over the workflow-instance collection, three of which
  // touch whole documents (instances embed their full executionPointers array,
  // so the collection averages ~65KB per row). Calling it twice per request - as
  // the registry list did, once for byStatus and once for failed pointers - turned
  // a 50s query into a 150s query on a 4.4GB collection.
  //
  // Two mitigations, both needed:
  //   1. COALESCE - concurrent callers share one in-flight promise, so a request
  //      that needs both halves performs exactly one scan.
  //   2. CACHE - results are reused for a short window, so opening the registry
  //      twice (or the dashboard polling) does not rescan.
  //
  // Staleness is acceptable because these are operational counters displayed in
  // a registry list; they are not used to drive execution.
  private statsSnapshot: { at: number; value: IInstanceStatsSnapshot } | null = null;
  private statsSnapshotInFlight: Promise<IInstanceStatsSnapshot> | null = null;
  /**
   * Incremented by invalidateInstanceStatsCache(). A scan that started BEFORE an
   * invalidation must not write its (now stale) result back into the cache - see
   * the guard in the `.then` below.
   */
  private statsCacheGeneration: number = 0;

  /**
   * Snapshot of instance statistics, coalesced and cached.
   *
   * Single source of truth for BOTH `getWorkflowExecutionStats()` and
   * `getInstancesWithFailedSteps()`, which are derived from the same provider
   * call. Never call `persistence.getWorkflowInstanceStats()` directly.
   *
   * @param options.maxAgeMs Cache lifetime. Defaults to WORKFLOW_STATS_CACHE_MS
   *   (30000). Pass 0 to bypass the cache read (in-flight coalescing still applies).
   */
  public async getInstanceStatsSnapshot(options?: { maxAgeMs?: number }): Promise<IInstanceStatsSnapshot> {
    const configured = Number(process.env.WORKFLOW_STATS_CACHE_MS);
    const defaultMaxAge = Number.isFinite(configured) && configured >= 0 ? configured : 30_000;
    const maxAgeMs = options?.maxAgeMs ?? defaultMaxAge;

    const now = Date.now();
    if (maxAgeMs > 0 && this.statsSnapshot && (now - this.statsSnapshot.at) < maxAgeMs) {
      return this.statsSnapshot.value;
    }

    // Coalesce: a second caller arriving while a scan is running waits for the
    // same promise instead of starting another aggregation.
    if (this.statsSnapshotInFlight) {
      return this.statsSnapshotInFlight;
    }

    const build = async (): Promise<IInstanceStatsSnapshot> => {
      if (!this.persistence) {
        return emptyInstanceStatsSnapshot();
      }

      const stats = await this.persistence.getWorkflowInstanceStats();

      // byStatus maps engine WorkflowStatus values:
      // 0=Runnable, 1=Suspended, 2=Complete, 3=Terminated, 4=DeadLettered
      const byStatus = stats.byStatus;

      const executionStats: IWorkflowExecutionStats = {
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

      return {
        stats: executionStats,
        instancesWithFailedSteps: stats.instancesWithFailedSteps || {},
        fetchedAt: new Date(),
      };
    };

    // Capture the generation this scan belongs to. If invalidateInstanceStatsCache()
    // runs while it is in flight (e.g. a retention sweep deleted rows mid-scan), the
    // result reflects pre-delete counts and must NOT be cached - otherwise the stale
    // numbers are served for the whole TTL.
    const generation = this.statsCacheGeneration;

    const inFlight = build()
      .then((value) => {
        if (generation === this.statsCacheGeneration) {
          this.statsSnapshot = { at: Date.now(), value };
        }
        return value;
      })
      .finally(() => {
        this.statsSnapshotInFlight = null;
      });

    this.statsSnapshotInFlight = inFlight;
    return inFlight;
  }

  /**
   * Invalidate the cached instance-stats snapshot (e.g. after a delete sweep).
   *
   * Also bumps the generation so any scan already in flight cannot re-cache its
   * pre-delete result when it resolves.
   */
  public invalidateInstanceStatsCache(): void {
    this.statsSnapshot = null;
    this.statsCacheGeneration += 1;
  }

  /**
   * Get workflow execution statistics through the active provider.
   */
  public async getWorkflowExecutionStats(): Promise<IWorkflowExecutionStats> {
    if (!this.persistence) {
      logger.debug('getWorkflowExecutionStats: no persistence provider — returning zero stats');
      return emptyInstanceStatsSnapshot().stats;
    }

    try {
      const snapshot = await this.getInstanceStatsSnapshot();
      return snapshot.stats;
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
      const snapshot = await this.getInstanceStatsSnapshot();
      return snapshot.instancesWithFailedSteps;
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
   * Return the salvage record for an instance IFF it still blocks cleanup.
   *
   * Load failures are treated as "nothing to block on": the guard exists to
   * protect work, and an unreadable row cannot be protected by refusing every
   * delete (that would wedge retention).
   */
  private async getUnresolvedSalvageFor(
    instanceOrId: string | WorkflowInstance | null | undefined,
  ): Promise<IWorkflowSalvageRecord | null> {
    if (!this.persistence || !instanceOrId) return null;

    // Callers that already hold the row (sweep, clear-by-definition) pass it in:
    // the record is embedded in the document, so there is no need to re-read it.
    const provided = typeof instanceOrId === 'string' ? null : instanceOrId;
    const instanceId = typeof instanceOrId === 'string'
      ? instanceOrId
      : String((instanceOrId as any).id || (instanceOrId as any)._id || '');
    if (!instanceId) return null;

    let instance: WorkflowInstance | null = provided;
    if (!instance) {
      try {
        instance = await this.persistence.getWorkflowInstance(instanceId);
      } catch {
        return null;
      }
    }
    // A row that does not exist cannot owe salvage work.
    if (!instance) return null;

    const existing = readSalvageRecord(instance);
    if (hasUnresolvedSalvage(existing)) {
      return existing as IWorkflowSalvageRecord;
    }

    // R1 (REACTORY-302016408/20261103/4082245933). Decide from the row we ALREADY
    // hold. A salvage record can only be derived for a terminated row that carries
    // worktree facts, so anything else is a definitive "nothing to block on" and
    // must not touch the database at all.
    //
    // Before this guard the sweep/clear paths did TWO more serial single-document
    // reads per row (the hook's own load, then a refresh) for rows that could never
    // yield a record — up to 20,000 rows x 2 reads of ~65 KB documents per sweep.
    // Today that was EVERY row, because nothing writes worktree facts yet.
    if (!isTerminationReasonStatus((instance as any).status)) return null;
    if (!readReportedWorktree(instance)) return null;

    // The hook is given the row we already hold, so it performs no read of its own,
    // and its RETURN VALUE is the answer — there is no second re-read.
    const captured = await this.attemptSalvageCapture(instanceId, instance);
    return hasUnresolvedSalvage(captured) ? captured : null;
  }

  /**
   * Delete a single workflow execution history item by instance ID.
   */
  public async deleteWorkflowHistory(instanceId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
    if (!this.persistence) {
      return { success: false, deletedCount: 0, message: 'No persistence provider configured' };
    }

    try {
      // Salvage guard: a terminated run that owes unpublished work must not have
      // its instance row (the only pointer to the worktree) deleted out from under
      // the operator. Acknowledge or record the salvage SHA first.
      const salvage = await this.getUnresolvedSalvageFor(instanceId);
      if (salvage) {
        return {
          success: false,
          deletedCount: 0,
          message:
            `Workflow instance ${instanceId} is blocked pending salvage acknowledgement: ` +
            `${salvage.worktreePath || 'unknown worktree'}` +
            `${salvage.branch ? ` on branch ${salvage.branch}` : ''} still holds unpublished work.`,
        };
      }

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
      // Salvage guard (batch): delete the rows we are allowed to delete and
      // report the ones held back, rather than failing the whole batch.
      const blocked: string[] = [];
      const deletable: string[] = [];
      for (const instanceId of instanceIds) {
        if (await this.getUnresolvedSalvageFor(instanceId)) {
          blocked.push(instanceId);
        } else {
          deletable.push(instanceId);
        }
      }

      if (deletable.length === 0) {
        return {
          success: false,
          deletedCount: 0,
          message:
            `All ${blocked.length} instance(s) are blocked pending salvage acknowledgement: ` +
            blocked.join(', '),
        };
      }

      const deletedCount = await this.persistence.deleteWorkflowInstances(deletable);

      logger.info(`Deleted ${deletedCount} workflow execution history items`);
      return {
        success: true,
        deletedCount,
        message: blocked.length > 0
          ? `Deleted ${deletedCount}; ${blocked.length} blocked pending salvage acknowledgement: ${blocked.join(', ')}`
          : `Successfully deleted ${deletedCount} workflow instances`,
      };
    } catch (error) {
      logger.error('Failed to delete workflow execution history batch', error);
      throw error;
    }
  }

  /**
   * Clear all workflow execution history for a specific workflow definition.
   *
   * SALVAGE-GUARDED. This is the fourth deletion route (the other three are
   * `deleteWorkflowHistory`, `deleteWorkflowHistoryBatch` and
   * `sweepExpiredInstances`) and it is reachable from the
   * `clearWorkflowExecutionHistory` mutation. It used to call
   * `deleteWorkflowInstancesByDefinitionId` unconditionally, so an operator
   * clearing one definition's history silently destroyed any unresolved salvage
   * record — and with it the only pointer to a worktree holding unpublished work.
   * That was the exact hole the guard exists to prevent, so the wipe is now
   * partitioned the same way the other routes are.
   *
   * Rows are listed first (bounded), then the allowed ones are deleted by id. A
   * definition with more instances than the page bound keeps its oldest rows for
   * a later pass rather than risking an unguarded mass delete, and `hasMore`
   * reports that.
   */
  public async clearWorkflowHistory(
    workflowDefinitionId: string,
    options: { batchSize?: number; maxBatches?: number } = {},
  ): Promise<{
    success: boolean;
    deletedCount: number;
    message?: string;
    /** Instances held back because they still owe salvage work. */
    skippedSalvage?: number;
    /** Ids held back, so an operator knows exactly what to resolve. */
    blockedInstanceIds?: string[];
    /** True when more rows remain (hit the page bound) — run again to continue. */
    hasMore?: boolean;
  }> {
    if (!this.persistence) {
      return { success: false, deletedCount: 0, message: 'No persistence provider configured' };
    }

    if (!workflowDefinitionId) {
      return { success: false, deletedCount: 0, message: 'Workflow definition ID is required' };
    }

    const batchSize = Math.min(Math.max(Math.trunc(options?.batchSize ?? 500) || 500, 1), 500);
    const maxBatches = Math.min(Math.max(Math.trunc(options?.maxBatches ?? 20) || 20, 1), 200);

    try {
      let deletedCount = 0;
      let skippedSalvage = 0;
      let hasMore = false;
      const blockedInstanceIds: string[] = [];

      for (let batch = 0; batch < maxBatches; batch += 1) {
        // Always page from 0: the previous batch was deleted, so the next window
        // slides up. Rows held back for salvage are skipped by id, not by paging.
        const { instances } = await this.persistence.queryWorkflowInstances({
          workflowDefinitionId,
          take: batchSize,
          skip: 0,
          sortField: 'createTime',
          sortOrder: 'asc',
        });

        if (!instances || instances.length === 0) {
          hasMore = false;
          break;
        }

        const deletable: string[] = [];
        for (const instance of instances) {
          const instanceId = String((instance as any).id || (instance as any)._id || '');
          if (!instanceId) continue;

          if (await this.getUnresolvedSalvageFor(instance)) {
            skippedSalvage += 1;
            blockedInstanceIds.push(instanceId);
            continue;
          }
          deletable.push(instanceId);
        }

        if (deletable.length === 0) {
          // Every row on this page is held back. Paging from 0 would return the
          // same rows forever, so stop and report the backlog.
          hasMore = false;
          break;
        }

        deletedCount += await this.persistence.deleteWorkflowInstances(deletable);
        hasMore = instances.length >= batchSize;
        if (!hasMore) break;
      }

      if (deletedCount > 0) {
        this.invalidateInstanceStatsCache();
      }

      logger.info(
        `Cleared ${deletedCount} workflow execution history items for ${workflowDefinitionId}` +
        (skippedSalvage > 0 ? ` — ${skippedSalvage} held back pending salvage acknowledgement` : '')
      );

      return {
        success: true,
        deletedCount,
        skippedSalvage,
        blockedInstanceIds,
        hasMore,
        message: skippedSalvage > 0
          ? `Cleared ${deletedCount}; ${skippedSalvage} blocked pending salvage acknowledgement: ${blockedInstanceIds.join(', ')}`
          : `Successfully cleared ${deletedCount} workflow instances for ${workflowDefinitionId}`,
      };
    } catch (error) {
      logger.error('Failed to clear workflow execution history', error);
      throw error;
    }
  }

  // ============================================
  // Retention — time-scoped sweeping of terminal instances
  // ============================================

  /**
   * Delete terminal workflow instances older than a cutoff, in bounded batches.
   *
   * WHY THIS EXISTS
   * ---------------
   * The `workflows` collection is append-only by nature: every run adds a document
   * that embeds its full executionPointers array (average ~65KB). At the time of
   * writing it held ~67,000 instances / 4.4GB, and every dashboard statistic or
   * registry read has to traverse it. Without retention the read cost grows
   * monotonically with the number of runs ever executed - the platform gets
   * slower every day it is used.
   *
   * SAFETY
   * ------
   *  - Only TERMINAL statuses are eligible (default Complete + Terminated).
   *    Runnable/Suspended instances are live work and are refused even if the
   *    caller asks for them.
   *  - Work is bounded per call (`batchSize` x `maxBatches`), so a sweep can never
   *    monopolise the database. `hasMore` reports whether to run again.
   *  - `dryRun` reports the match count without deleting, so an operator can size
   *    the impact before committing.
   *  - Instances that still owe salvage work (a terminated run that left
   *    unpublished changes behind) are skipped and counted in `skippedSalvage`:
   *    the instance row is the only pointer to that worktree.
   *  - The stats cache is invalidated on a real delete so counters are not stale.
   *
   * Provider-agnostic: uses only queryWorkflowInstances + deleteWorkflowInstances,
   * so it works for Mongo, SQLite and Postgres alike.
   */
  public async sweepExpiredInstances(options: {
    olderThanDays: number;
    statuses?: WorkflowESStatus[];
    batchSize?: number;
    maxBatches?: number;
    dryRun?: boolean;
  }): Promise<{
    matched: number;
    deleted: number;
    /** Rows held back because they still owe salvage work. */
    skippedSalvage: number;
    batches: number;
    hasMore: boolean;
    cutoff: Date;
  }> {
    const startedAt = Date.now();
    const olderThanDays = Number(options?.olderThanDays);

    if (!Number.isFinite(olderThanDays) || olderThanDays <= 0) {
      throw new Error('sweepExpiredInstances: olderThanDays must be a positive number');
    }

    const cutoff = new Date(startedAt - olderThanDays * 24 * 60 * 60 * 1000);
    const batchSize = Math.min(Math.max(Math.trunc(options?.batchSize ?? 500) || 500, 1), 500);
    const maxBatches = Math.min(Math.max(Math.trunc(options?.maxBatches ?? 20) || 20, 1), 200);
    const dryRun = options?.dryRun === true;

    // Terminal-only. Runnable(0) and Suspended(1) are live and never swept.
    const requested = Array.isArray(options?.statuses) && options.statuses.length > 0
      ? options.statuses
      : [WorkflowESStatus.COMPLETE, WorkflowESStatus.TERMINATED];
    const statuses = requested.filter(
      (s) => s === WorkflowESStatus.COMPLETE || s === WorkflowESStatus.TERMINATED
    );

    if (statuses.length === 0) {
      throw new Error(
        'sweepExpiredInstances: only COMPLETE and TERMINATED instances may be swept ' +
        '(Runnable/Suspended instances are live work)'
      );
    }

    if (!this.persistence) {
      return { matched: 0, deleted: 0, skippedSalvage: 0, batches: 0, hasMore: false, cutoff };
    }

    let matched = 0;
    let deleted = 0;
    let batches = 0;
    let hasMore = false;
    let skippedSalvage = 0;

    for (let batch = 0; batch < maxBatches; batch += 1) {
      // Always page from 0: the previous batch was deleted, so the next-oldest
      // window slides up. Skipping would skip rows we just removed.
      const { instances, total } = await this.persistence.queryWorkflowInstances({
        status: statuses as any,
        createdBefore: cutoff,
        take: batchSize,
        skip: 0,
        sortField: 'createTime',
        sortOrder: 'asc',
      });

      batches += 1;

      if (dryRun) {
        // A dry run deletes nothing, so one page would come back forever. Report
        // the EXACT match count from the provider's `total` (Mongo's is a
        // countDocuments on the same filter, SQLite/Postgres return total too) -
        // paging would cap `matched` at batchSize and under-report a backlog.
        matched = typeof total === 'number' && total >= 0
          ? Math.max(total, instances?.length ?? 0)
          : (instances?.length ?? 0);
        hasMore = false;
        break;
      }

      if (!instances || instances.length === 0) {
        hasMore = false;
        break;
      }

      matched += instances.length;

      // Salvage guard: never delete the only pointer to unpublished work. Rows
      // held back stay in the collection (and are reported) until the salvage
      // record is acknowledged or a salvage/published SHA is recorded.
      const ids: string[] = [];
      for (const instance of instances) {
        const instanceId = String((instance as any).id || (instance as any)._id || '');
        if (!instanceId) continue;
        if (await this.getUnresolvedSalvageFor(instance)) {
          skippedSalvage += 1;
          continue;
        }
        ids.push(instanceId);
      }

      if (ids.length === 0) {
        // Every row on this page is held back. Paging from 0 would return the
        // same rows forever, so stop and let the caller see the backlog.
        hasMore = false;
        break;
      }

      deleted += await this.persistence.deleteWorkflowInstances(ids);
      hasMore = instances.length >= batchSize;
      if (!hasMore) break;    }

    if (deleted > 0) {
      this.invalidateInstanceStatsCache();
      logger.info(
        `Workflow retention sweep removed ${deleted} terminal instances older than ${cutoff.toISOString()} ` +
        `in ${batches} batch(es) (${Date.now() - startedAt}ms)` +
        (skippedSalvage > 0 ? ` — ${skippedSalvage} held back pending salvage acknowledgement` : '')
      );
    }

    return { matched, deleted, skippedSalvage, batches, hasMore, cutoff };
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
