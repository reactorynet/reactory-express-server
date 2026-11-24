import {
  configureWorkflow,
  IPersistenceProvider,
  ILogger,
  LogLevel,
  LogContext,
  WorkflowHost,
  IWorkflowHost,
} from '@reactorynet/workflow-es';
import { MongoDBPersistence } from '@reactorynet/workflow-es-mongodb';
import {
  mongoClientOptions,
  postgresUrl,
  sequelizePostgresOptions,
} from '@reactory/server-core/database/connectionOptions';
import { RedisQueueProvider, RedisLockManager } from '@reactorynet/workflow-es-redis';
import Redis from 'ioredis';
import { isArray } from 'lodash';
import moment from 'moment';
import amq from '../../../../amq';
import reactoryModules from '../../..';
import logger from '../../../../logging';
import { IScheduleConfig, WorkflowScheduler } from '../Scheduler/Scheduler';
import { ErrorHandler, IErrorContext, ErrorCategory, ErrorSeverity, IWorkflowErrorStats } from '../ErrorHandler/ErrorHandler';
import {
  WorkflowLifecycleManager,
  WorkflowStatus,
  WorkflowPriority,
  WorkflowESStatus,
  ExecutionPointerStatus,
  type IWorkflowInstance,
  type IWorkflowDependency,
  type IWorkflowLifecycleStats
} from '../LifecycleManager/LifecycleManager';
import { ConfigurationManager, IConfigurationStats, type IWorkflowConfig } from '../ConfigurationManager/ConfigurationManager';
import { ISecurityStats, SecurityManager, type IInputValidationResult } from '../SecurityManager/SecurityManager';
import { YamlStepRegistry } from '../YamlFlow/steps/registry/YamlStepRegistry';
import { YamlFlowParser } from '../YamlFlow/YamlFlowParser';
import type { YamlWorkflowDefinition } from '../YamlFlow/types/WorkflowDefinition';
import {
  buildYamlWorkflowClass,
  engineWorkflowId,
  applyYamlInputDefaults,
} from '../YamlFlow/YamlFlowBuilder';
import { configureYamlFlowRuntime } from '../YamlFlow/execution/YamlFlowRuntime';
import { finalizeInstanceIfTerminal } from '../YamlFlow/execution/YamlStepBody';
import {
  WorkflowInstanceLifecycleRecorder,
  type ISalvageRecordInput,
} from '../termination/TerminationRecorder';
import {
  classifyDeadLetterReason,
  classifyTerminationError,
  isEngineTerminalStatus,
  TerminationReasonCode,
  type IWorkflowSalvageRecord,
} from '../termination/TerminationReason';

const {
  MONGOOSE,
  // Persistence backend for the workflow-es host:
  //   'mongo'    — MongoDBPersistence (requires MONGOOSE env var)
  //   'sqlite'   — SqlitePersistence  (requires WORKFLOW_SQLITE_PATH or defaults under APP_DATA_ROOT)
  //   'postgres' — PostgresPersistence (requires WORKFLOW_POSTGRES_URL or falls back to REACTORY_POSTGRES_* / POSTGRES_*)
  //   'memory'   — in-process only, no durability (default when no provider matched)
  WORKFLOW_PERSISTENCE_PROVIDER = 'mongo',
  // SQLite: absolute path to the database file.
  // Defaults to $APP_DATA_ROOT/workflows/workflow.db when APP_DATA_ROOT is set.
  WORKFLOW_SQLITE_PATH,
  APP_DATA_ROOT,
  // Postgres: connection URL. Falls back to REACTORY_POSTGRES_URL then POSTGRES_URL.
  WORKFLOW_POSTGRES_URL,
  REACTORY_POSTGRES_URL,
  POSTGRES_URL,
  // When 'true', wire a distributed Redis lock + reliable queue (REACTORY_REDIS_*)
  // so the host is safe to run across multiple instances. When unset/false the
  // host uses the in-process single-node lock/queue (single-instance only) and
  // explicitly opts past the engine's multi-node safety guard.
  WORKFLOW_CLUSTER_MODE,
  REACTORY_REDIS_HOST = 'localhost',
  REACTORY_REDIS_PORT = '6379',
  REACTORY_REDIS_PASSWORD,
  REACTORY_REDIS_DB = '0',
} = process.env;

const WORKFLOW_CLUSTER_ENABLED = String(WORKFLOW_CLUSTER_MODE).toLowerCase() === 'true';

/**
 * Compare two workflow versions numerically, segment by segment.
 *
 * Workflow versions in this platform are dotted numeric triples ('1.4.3'). A
 * string comparison would sort '1.10.0' BELOW '1.9.0', so the segments are
 * compared as numbers. Missing segments count as 0, and any non-numeric suffix
 * is ignored (`1.4.3-beta` compares as 1.4.3).
 *
 * Returns a positive number when `a` is newer than `b`.
 */
/**
 * Pick a registered workflow by namespace + name.
 *
 * Exported (and therefore unit-testable) because the "which version does this
 * name mean" decision is the difference between running the shipped definition
 * and silently running a stale one.
 */
export const selectWorkflowByName = <T extends { nameSpace: string; name: string; version: string }>(
  workflows: T[],
  nameSpace: string,
  name: string,
  version?: string,
): T | undefined => {
  const matches = (workflows || []).filter(
    (workflow) => workflow.nameSpace === nameSpace && workflow.name === name,
  );
  if (matches.length === 0) return undefined;
  if (version) return matches.find((workflow) => workflow.version === version);
  return matches.reduce((latest, candidate) =>
    compareWorkflowVersions(candidate.version, latest.version) > 0 ? candidate : latest,
  );
};

export const compareWorkflowVersions = (a: string, b: string): number => {
  const parse = (value: string): number[] => String(value || '0')
    .trim()
    .split('.')
    .map((segment) => parseInt(segment, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Indicates the source type of a workflow definition.
 * - YAML: Declarative workflow loaded from a .yaml / .yml file via the YamlFlow engine.
 * - CODE: Programmatic workflow defined as a TypeScript/JavaScript class.
 */
export type WorkflowType = 'YAML' | 'CODE';

export interface IWorkflow {
  nameSpace: string;
  name: string;
  version: string;
  component: any;
  category: string;
  /**
   * Type of workflow definition.
   * YAML = loaded from a YAML file via the YamlFlow engine.
   * CODE = programmatic TypeScript/JavaScript workflow class.
   * Defaults to 'CODE' when not specified.
   */
  workflowType?: WorkflowType;
  /**
   * File system path or URL where the workflow definition originates.
   * For YAML workflows this is the absolute path to the .yaml file.
   * For code-based workflows this is typically the module path.
   */
  location?: string;
  autoStart?: boolean;
  props?: any;
  isActive?: boolean;
  schedules?: IScheduleConfig[];
  intances?: IWorkflowInstance[];
  errors?: IWorkflowErrorStats[];
  status?: 'INACTIVE' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' | 'FAILED';
  configuration?: IWorkflowConfig;
  instances?: IWorkflowInstance[];
  dependencies?: IWorkflowDependency[];        
}

export interface IWorkflowState {
  workflows: IWorkflow[];
  host: WorkflowHost | null;
}

export interface IWorkflowRunnerProps {
  workflows?: IWorkflow[];
}

export interface IWorkflowStartResult {
  host: WorkflowHost;
  autoStart: IWorkflow[];
}

export interface IWorkflowPayload {
  id: string;
  version: string;
  data: any;
  src: string;
}

export interface IWorkflowStartData {
  when: number;
  props?: any;
}

const safeCallback = (cb: ((params: any) => void) | undefined, params: any): void => {
  if (typeof cb === 'function') cb(params);
};

/**
 * Adapter from workflow-es' structured ILogger (M4) onto the Reactory winston
 * logger. The engine calls `log(level, message, context)`; we route by level and
 * forward the correlation context (workflowId/stepId/tenantId/err/...) as meta.
 */
class Logger implements ILogger {
  log(level: LogLevel, message: string, context?: LogContext): void {
    const meta = context ?? {};
    switch (level) {
      case LogLevel.Error:
        logger.error(message, meta);
        break;
      case LogLevel.Warn:
        logger.warn(message, meta);
        break;
      case LogLevel.Debug:
        logger.debug(message, meta);
        break;
      case LogLevel.Silent:
        break;
      case LogLevel.Info:
      default:
        logger.info(message, meta);
        break;
    }
  }
}

const getDefaultWorkflows = (): IWorkflow[] => {

  const availableworkflows: IWorkflow[] = [];
  reactoryModules.enabled.forEach((reactoryModule) => {
    if (isArray(reactoryModule.workflows)) {    
      reactoryModule.workflows.forEach((workflow: any) => {
        if (typeof workflow === 'object' && workflow.category === 'workflow') {
          logger.debug(`🔀 Loading workflow for module ${reactoryModule.name} ${workflow.nameSpace}.${workflow.name}@${workflow.version} from ${workflow?.location || `${reactoryModule.name}/workflows`}`);        
          availableworkflows.push(workflow);
        } else {
          logger.warn(`Did not load workflow item - bad shape, expecting object with category "workflow" found ${typeof workflow}`, workflow);
        }
      });
    }
  });
  return availableworkflows;
}

let instance: WorkflowRunner | null = null;

/**
 * The runner that currently owns the process-level fatal handlers.
 *
 * Exactly one runner may own them: `initialize()` can legitimately be called by
 * a second runner in-process (tests, or a re-initialised singleton), and
 * blindly prepending another pair of listeners on every init would leak
 * listeners and eventually print MaxListenersExceededWarning.
 */
let fatalHandlerOwner: WorkflowRunner | null = null;

/**
 * Workflow runner is a singleton class that manages the workflow engine and the workflow host.
 */
export class WorkflowRunner {  
  private persistence: IPersistenceProvider | null = null;
  private redis: Redis | null = null;
  private state: IWorkflowState;
  private _isInitialized: boolean = false;
  private _isStarting: boolean = false;
  /** In-flight initialization, shared so concurrent callers don't double-init. */
  private _initPromise: Promise<void> | null = null;
  private scheduler: WorkflowScheduler | null = null;
  private readonly errorHandler: ErrorHandler;
  private readonly lifecycleManager: WorkflowLifecycleManager;
  private readonly configurationManager: ConfigurationManager;
  private readonly securityManager: SecurityManager;   
  private readonly context: Reactory.Server.IReactoryContext;
  private stepRegistry: YamlStepRegistry;
  /** Engine ids of YAML workflows already registered with the host (idempotency guard). */
  private readonly registeredYamlIds: Set<string> = new Set();
  /** Engine instance ids of running YAML workflows awaiting log finalization. */
  private readonly yamlFinalizeWatch: Set<string> = new Set();
  /** Shared interval that finalizes instance logs once a YAML run reaches a terminal state. */
  private yamlFinalizeTimer: NodeJS.Timeout | null = null;

  /** Handle for the periodic retention sweep (WORKFLOW_RETENTION_DAYS). */
  private retentionTimer: NodeJS.Timeout | null = null;
  /** One-shot handle for the first post-boot sweep; cleared by stop(). */
  private retentionKickoff: NodeJS.Timeout | null = null;
  private retentionRunning: boolean = false;

  /**
   * Writes termination reasons, `completeTime` backfills, last-activity-adjacent
   * salvage records. See workflow/termination/TerminationRecorder.ts.
   */
  private readonly terminationRecorder: WorkflowInstanceLifecycleRecorder;

  /**
   * Engine instance ids this process is currently running.
   *
   * Bounded by concurrency (not by the size of the `workflows` collection), so a
   * signal/crash handler can record a reason for each in O(running), not O(all).
   * Populated on start, cleared when the instance reaches a terminal state.
   */
  private readonly inFlightInstances: Map<string, { workflowId: string; startedAt: Date }> = new Map();

  /** Process-level handlers installed for the fatal paths; removed by stop(). */
  private fatalErrorHandlers: {
    uncaught: (error: any) => void;
    rejection: (error: any) => void;
  } | null = null;

  constructor(props: IWorkflowRunnerProps, context: Reactory.Server.IReactoryContext) {
    this.state = {
      workflows: props?.workflows || getDefaultWorkflows(),
      host: null,
    };
    this.context = context;
    this.stepRegistry = new YamlStepRegistry();
    this.errorHandler = new ErrorHandler();
    this.terminationRecorder = new WorkflowInstanceLifecycleRecorder({ logger });
    this.lifecycleManager = new WorkflowLifecycleManager();
    this.configurationManager = new ConfigurationManager({
      configPath: process.env.APP_DATA_ROOT ? `${process.env.APP_DATA_ROOT}/workflows/config` : './data/workflows/config',
      environment: process.env.NODE_ENV || 'development',
      hotReload: true,
      validationStrict: true,
      backupConfigs: true,
      maxConfigSize: 1024 * 1024, // 1MB
      allowedEnvironments: ['development', 'staging', 'production', 'test']
    });
    this.securityManager = new SecurityManager({
      auditLogEnabled: true,
      auditLogRetention: 90, // days
      securityEventsEnabled: true,
      rateLimitingEnabled: true,
      inputValidationEnabled: true,
      encryptionEnabled: false,
      allowedOrigins: ['*'],
      maxRequestSize: 1024 * 1024, // 1MB
      sessionTimeout: 30 * 60 * 1000 // 30 minutes
    });
    this.initialize = this.initialize.bind(this);
    this.startWorkflow = this.startWorkflow.bind(this);
    this.registerWorkflow = this.registerWorkflow.bind(this);
    this.validateWorkflow = this.validateWorkflow.bind(this);
    this.onStateChanged = this.onStateChanged.bind(this);
    this.setState = this.setState.bind(this);
    this.stop = this.stop.bind(this);    
  }

  public static getInstance(props: IWorkflowRunnerProps, context: Reactory.Server.IReactoryContext): WorkflowRunner {
    if (!instance) {
      instance = new WorkflowRunner(props, context);            
    } 
    return instance;
  }

  public static shutdown(): void {
    if (instance) {
      void instance.stop();
      instance = null;
    }
  }

  /**
   * Initialize the workflow runner
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }
    // Coalesce concurrent initialize() calls onto a single in-flight init.
    // Without this, two callers racing at boot (both seeing isInitialized()===
    // false) would each build and start a host — re-introducing the very
    // registration/sweep race this ordering fixes.
    if (this._initPromise) {
      return this._initPromise;
    }
    this._initPromise = this._doInitialize();
    try {
      await this._initPromise;
    } catch (err) {
      // Clear so a later caller can retry after a failed initialization.
      this._initPromise = null;
      throw err;
    }
  }

  private async _doInitialize(): Promise<void> {
    try {
      this._isStarting = true;
      // start() configures the host and registers all code + declared workflows,
      // but does NOT start the worker yet (see the note there).
      const { host, autoStart } = await this.start();
      this.setState({ host });

      // Discover and register workflow steps from all enabled modules
      this.discoverModuleSteps();

      // Share the registry + system context with the YAML→engine bridge so YAML
      // steps can resolve services and rehydrate a context at run time.
      configureYamlFlowRuntime({ registry: this.stepRegistry, systemContext: this.context });

      // Discover YAML workflows persisted in the catalog directory that are
      // not yet registered (e.g. workflows created via the designer and saved
      // to disk but not declared in a module definition), and bridge them onto
      // the (not-yet-started) host.
      await this.discoverCatalogWorkflows();

      // Every definition is now registered on the host — it is finally safe to
      // start the worker, which resumes any persisted runnable instances without
      // racing definition registration.
      await host.start();
      this._isInitialized = true;
      this._isStarting = false;

      // Set up AMQ event handlers
      await this.setupAmqEventHandlers();
      
      // Start auto-start workflows
      await this.startAutoStartWorkflows(autoStart);

      // Initialize scheduler
      this.scheduler = new WorkflowScheduler(this);
      await this.scheduler.initialize();
      

      // Initialize lifecycle manager — pass the active persistence provider so
      // history reads / stats / deletes go through the provider (M9 Phase 2).
      await this.lifecycleManager.initialize({
        host,
        persistence: this.persistence,
      });

      // Let the cleanup guards derive a salvage record from a persisted
      // `data.__reactory.worktree` before deciding a row is deletable. Without
      // this, auto-capture only ran from the in-memory finalize watch, so a run
      // started by a PREVIOUS process (the live incident), a DeadLettered row or
      // a code workflow had no record — and was therefore deletable.
      this.lifecycleManager.setSalvageCaptureHook(
        (instanceId: string) => this.terminationRecorder.captureSalvageForTerminatedInstance(instanceId),
      );

      // Initialize configuration manager
      await this.configurationManager.initialize({
        host,
      });

      // Initialize security manager
      await this.securityManager.initialize({
        host,
      });

      // ── Termination-reason recording ──────────────────────────────────────
      // A Terminated instance used to carry no reason at all: status 3, zero
      // failed steps, no error, completeTime null. Wire every path that can
      // reach a terminal state to the recorder, then flush anything a previous
      // process queued on its way down.
      this.terminationRecorder.setPersistence(this.persistence);
      this.subscribeToEngineLifecycleEvents(host);
      this.installFatalErrorHandlers();
      try {
        const drained = await this.terminationRecorder.drainOutbox();
        if (drained.applied + drained.interrupted + drained.requeued > 0) {
          logger.warn('Termination-reason outbox drained at startup', drained);
        }
      } catch (error) {
        logger.warn('Failed to drain the termination-reason outbox (records are kept for the next boot)', error);
      }

      // Retention: keep the instance collection bounded so read latency does not
      // grow with every run the platform has ever executed. No-op unless
      // WORKFLOW_RETENTION_DAYS is configured.
      this.startRetentionSweeper();

      logger.info('WorkflowRunner initialized successfully');
    } catch (error) {
      this._isStarting = false;
      logger.error('Failed to initialize WorkflowRunner', error);
      throw error;
    }
  }

  /**
   * Get the shared step registry used by this runner
   */
  public getStepRegistry(): YamlStepRegistry {
    return this.stepRegistry;
  }

  /**
   * Discover workflow step implementations from all enabled modules
   * and register them in the shared step registry.
   */
  private discoverModuleSteps(): void {
    // `|| []` already says a missing module list is fine — but the context
    // itself was dereferenced bare, so a runner constructed without one threw
    // "Cannot read properties of undefined (reading 'modules')" from inside
    // initialize().
    const modules: Reactory.Server.IReactoryModule[] = (this.context as any)?.modules || [];
    let registeredCount = 0;
    for (const mod of modules) {
      if (!mod.workflowSteps || !Array.isArray(mod.workflowSteps)) continue;
      for (const stepProvider of mod.workflowSteps) {
        try {
          this.stepRegistry.registerStep(
            stepProvider.stepType,
            stepProvider.constructor as any,
            stepProvider.options || {},
            (stepProvider as any).definition,
            'module'
          );
          registeredCount++;
          logger.debug(
            `Registered workflow step '${stepProvider.stepType}' from module ${mod.nameSpace}.${mod.name}`
          );
        } catch (error) {
          logger.warn(
            `Failed to register step '${stepProvider.stepType}' from module ${mod.nameSpace}.${mod.name}: ${error}`
          );
        }
      }
    }
    logger.info(
      `Step registry initialized with ${this.stepRegistry.getRegisteredSteps().length} step types` +
      (registeredCount > 0 ? ` (${registeredCount} from modules)` : '')
    );
  }

  /**
   * Set up AMQ event handlers
   */
  private async setupAmqEventHandlers(): Promise<void> {
    try {
      amq.onWorkflowEvent('startWorkflow', async (payload: IWorkflowPayload) => {
        try {
          logger.debug('Reactory workflow starting via amq', payload);
          const { id, version, data, src } = payload;
          const startResult = await this.startWorkflow(id, version, data);
          logger.debug(`Workflow ${id} has been started`, startResult);
          amq.raiseWorkFlowEvent(`reactory.workflow.started:${src}`, startResult);
        } catch (error) {
          logger.error('Failed to start workflow via AMQ', error);
          // Don't re-throw to prevent service crash
        }
      });
    } catch (error) {
      logger.error('Failed to setup AMQ event handlers', error);
      // Don't re-throw to prevent service crash
    }
  }

  /**
   * Start auto-start workflows
   */
  private async startAutoStartWorkflows(autoStart: IWorkflow[]): Promise<void> {
    try {
      for (const autoStartWorkFlow of autoStart) {
        logger.debug(`Auto Starting Workflow ${autoStartWorkFlow.name}`, { autoStartWorkFlow });
        const { nameSpace, name, version, props } = autoStartWorkFlow;
        const startData: IWorkflowStartData = {
          when: moment().valueOf(),
          props: autoStartWorkFlow.props || {},
        };

        if (autoStartWorkFlow.props?.interval) {
          setInterval(async () => {
            try {
              amq.raiseWorkFlowEvent('startWorkflow', {
                id: `${nameSpace}.${name}@${version}`,
                version: version,
                data: startData,
                src: 'self'
              });
            } catch (error) {
              logger.error(`Failed to start interval workflow ${autoStartWorkFlow.name}`, error);
            }
          }, autoStartWorkFlow.props.interval);
        } else {
          try {
            amq.raiseWorkFlowEvent('startWorkflow', {
              id: autoStartWorkFlow.name,
              version: autoStartWorkFlow.version,
              data: startData,
              src: 'self'
            });
          } catch (error) {
            logger.error(`Failed to start auto-start workflow ${autoStartWorkFlow.name}`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to start auto-start workflows', error);
      // Don't re-throw to prevent service crash
    }
  }

  /**
   * Handle state changes
   */
  private onStateChanged(oldState: IWorkflowState, newState: IWorkflowState): void {
    // determine the changes
    const changes = Object.keys(newState).filter(key => newState[key as keyof IWorkflowState] !== oldState[key as keyof IWorkflowState]);
    logger.debug('Workflow State Changed', { changes });
  }

  /**
   * Set state with callback
   */
  private setState(state: Partial<IWorkflowState>, cb?: () => void): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...state };
    this.onStateChanged(oldState, this.state);
    safeCallback(cb, undefined);
  }

  /**
   * Validate workflow.
   * CODE workflows require a component class; YAML workflows require props (the parsed definition).
   */
  private validateWorkflow(workflow: IWorkflow): boolean {
    try {
      if (!workflow || !workflow.nameSpace || !workflow.name || !workflow.version) {
        return false;
      }
      if (workflow.workflowType === 'YAML') {
        // YAML workflows are valid if they carry a parsed definition (props) or
        // a source file (location) we can lazily parse and bridge to the engine.
        return !!(workflow.props || workflow.location);
      }
      return !!(workflow.component);
    } catch (error) {
      logger.error('Workflow validation failed', error);
      return false;
    }
  }

  /**
   * Register workflow
   */
  public registerWorkflow(workflow: IWorkflow): void {
    try {
      if (!this.validateWorkflow(workflow)) {
        throw new Error('Invalid workflow');
      }

      if (workflow.workflowType === 'YAML') {
        // YAML workflows are bridged into the workflow-es host as generated
        // workflow classes (durable engine execution). Registration is lazy-safe:
        // if the host isn't up yet, start() will register on host start.
        logger.debug(`Adding YAML workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} to registry`);
        if (this.state.host) {
          this.registerYamlWorkflowOnHost(workflow, this.state.host);
        }
        this.setState({ workflows: [...this.state.workflows, workflow] });
      } else if (this.state.host) {
        logger.debug('Adding workflow to host', workflow);
        this.state.host.registerWorkflow(workflow.component);
        this.setState({ workflows: [...this.state.workflows, workflow] });
      } else {
        throw new Error('Workflow host not initialized');
      }
    } catch (error) {
      logger.error('Failed to register workflow', error);
      throw error;
    }
  }

  /**
   * Get persistence provider.
   *
   * Reads WORKFLOW_PERSISTENCE_PROVIDER (mongo | sqlite | postgres | memory).
   *
   * mongo    — MongoDBPersistence; requires MONGOOSE connection string.
   * sqlite   — SqlitePersistence; uses WORKFLOW_SQLITE_PATH or
   *             $APP_DATA_ROOT/workflows/workflow.db.
   * postgres — PostgresPersistence; uses WORKFLOW_POSTGRES_URL,
   *             REACTORY_POSTGRES_URL, or POSTGRES_URL (first non-empty wins),
   *             else the REACTORY_POSTGRES_* / POSTGRES_* settings. TLS from
   *             REACTORY_POSTGRES_SSL (src/database/connectionOptions.ts).
   * memory   — returns null (no durability; history unavailable).
   */
  private async getPersistenceProvider(): Promise<IPersistenceProvider | null> {
    try {
      const provider = (WORKFLOW_PERSISTENCE_PROVIDER || 'mongo').toLowerCase();

      // ── Mongo ──────────────────────────────────────────────────────────────
      if (provider === 'mongo') {
        if (!MONGOOSE) {
          logger.warn(
            'WORKFLOW_PERSISTENCE_PROVIDER=mongo but MONGOOSE is not set — falling back to in-memory ' +
            '(workflow state will NOT survive a restart). Set MONGOOSE or WORKFLOW_PERSISTENCE_PROVIDER=memory.'
          );
          return null;
        }
        logger.debug('Using MongoDB for Workflow Persistence');
        // Same TLS / retryWrites settings as Mongoose (WP-B4).
        const mongoPersistence = new MongoDBPersistence(MONGOOSE, mongoClientOptions());
        await mongoPersistence.connect;
        // The provider MUST be passed in: this runs before getPersistenceProvider()
        // returns, and `initialize()` only assigns `this.persistence` from the
        // return value - so `this.persistence` is still null here.
        await this.ensureWorkflowQueryIndexes(mongoPersistence);
        return mongoPersistence;
      }

      // ── SQLite ─────────────────────────────────────────────────────────────
      if (provider === 'sqlite') {
        const { SqlitePersistence } = await import('@reactorynet/workflow-es-sqlite');
        let dbPath = WORKFLOW_SQLITE_PATH;
        if (!dbPath) {
          if (APP_DATA_ROOT) {
            const path = await import('path');
            const fs = await import('fs');
            const dir = path.join(APP_DATA_ROOT, 'workflows');
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            dbPath = path.join(dir, 'workflow.db');
          } else {
            logger.warn(
              'WORKFLOW_PERSISTENCE_PROVIDER=sqlite but neither WORKFLOW_SQLITE_PATH nor APP_DATA_ROOT ' +
              'is set — falling back to in-memory SQLite (:memory:). Set WORKFLOW_SQLITE_PATH for durability.'
            );
            dbPath = ':memory:';
          }
        }
        logger.debug(`Using SQLite for Workflow Persistence: ${dbPath}`);
        const sqlitePersistence = new SqlitePersistence(dbPath);
        await sqlitePersistence.connect;
        return sqlitePersistence;
      }

      // ── Postgres ───────────────────────────────────────────────────────────
      if (provider === 'postgres') {
        // A URL wins; otherwise the platform's own Postgres settings, as the
        // header comment always said. TLS follows REACTORY_POSTGRES_SSL (WP-B4).
        const connectionString = WORKFLOW_POSTGRES_URL || REACTORY_POSTGRES_URL || POSTGRES_URL || postgresUrl();
        const { PostgresPersistence } = await import('@reactorynet/workflow-es-postgres');
        logger.debug('Using PostgreSQL for Workflow Persistence');
        const postgresPersistence = new PostgresPersistence(connectionString, sequelizePostgresOptions(process.env, connectionString));
        await postgresPersistence.connect;
        return postgresPersistence;
      }

      // ── Memory / default ───────────────────────────────────────────────────
      logger.debug('Using in-memory Workflow Persistence (development/test only)');
      return null;
    } catch (error) {
      logger.error('Failed to get persistence provider', error);
      return null;
    }
  }

  /**
   * Create the access-path indexes the registry and ops queries depend on.
   *
   * The provider creates its own four mandatory indexes on connect, but none of
   * them covers the failed-execution-pointer rollup used by the registry list and
   * the dashboard (`$match: { status: {$ne: Terminated}, 'executionPointers.status': Failed }`).
   * Without an index that aggregation is a collection scan, and because instances
   * embed their full executionPointers array (~65KB/row) that scan dominated the
   * query - it was measured contributing to a ~150s registry read.
   *
   * Index creation is idempotent (same key spec = no-op), so this is safe on every
   * boot. Failure is logged and ignored: a missing index degrades performance, it
   * must never prevent the runner from starting.
   *
   * @param provider The provider to index. Passed explicitly rather than read from
   *   `this.persistence`: this is awaited inside `getPersistenceProvider()` before
   *   that function returns, and `initialize()` only assigns `this.persistence`
   *   from the return value - so reading the field here silently saw `null` on
   *   every real boot and the index was never created.
   */
  private async ensureWorkflowQueryIndexes(provider: any): Promise<void> {
    try {
      const collection: any = provider?.workflowCollection;

      if (!collection || typeof collection.createIndex !== 'function') {
        // Mongo is the only provider that has this collection, so reaching here
        // with the Mongo provider means something is wrong - not a benign skip.
        // warn, not debug: at debug level the index silently never existed.
        logger.warn(
          'Workflow index bootstrap could not find a MongoDB collection on the persistence provider; ' +
          'the failed-execution-pointer rollup will run as a collection scan'
        );
        return;
      }

      // Multikey over the embedded pointers array.
      await collection.createIndex(
        { status: 1, 'executionPointers.status': 1 },
        { name: 'idx_workflows_status_pointer_status', background: true }
      );

      logger.debug('Workflow query indexes verified');
    } catch (error) {
      logger.warn('Failed to create workflow query indexes (performance only, continuing)', error);
    }
  }

  /**
   * Periodic retention sweep of terminal workflow instances.
   *
   * DISABLED BY DEFAULT. Enable with WORKFLOW_RETENTION_DAYS=<n>; the sweep then
   * removes COMPLETE/TERMINATED instances older than n days, in bounded batches.
   * Once per sweep window (`WORKFLOW_RETENTION_SWEEP_INTERVAL_MS`, default 6h) it
   * repeats until `hasMore` is false, so a large backlog drains without holding
   * the database for one long transaction.
   *
   * This is what stops read latency from growing with every run the platform has
   * ever executed - the instance collection is otherwise append-only.
   */
  private startRetentionSweeper(): void {
    const days = Number(process.env.WORKFLOW_RETENTION_DAYS);

    if (!Number.isFinite(days) || days <= 0) {
      logger.debug('Workflow retention sweeper disabled (set WORKFLOW_RETENTION_DAYS to enable)');
      return;
    }

    const configuredInterval = Number(process.env.WORKFLOW_RETENTION_SWEEP_INTERVAL_MS);
    const intervalMs = Number.isFinite(configuredInterval) && configuredInterval >= 60_000
      ? configuredInterval
      : 6 * 60 * 60 * 1000;

    const runSweep = async (): Promise<void> => {
      if (this.retentionRunning) {
        logger.debug('Workflow retention sweep skipped: previous run still in progress');
        return;
      }

      this.retentionRunning = true;
      try {
        // Drain in bounded passes so one window does not scan forever.
        for (let pass = 0; pass < 10; pass += 1) {
          // Smaller batch than the API default: each batch loads whole documents
          // (~65KB each) just to collect ids, so 500 would mean ~33MB resident per
          // batch. 100 keeps the sweep's footprint well below a registry read while
          // still draining a backlog in bounded passes.
          const result = await this.lifecycleManager.sweepExpiredInstances({
            olderThanDays: days,
            batchSize: 100,
            maxBatches: 20,
          });

          if (result.deleted > 0) {
            logger.info(
              `Workflow retention: removed ${result.deleted} terminal instances older than ${result.cutoff.toISOString()}`
            );
          }

          if (!result.hasMore) break;
        }
      } catch (error) {
        logger.error('Workflow retention sweep failed', error);
      } finally {
        this.retentionRunning = false;
      }
    };

    this.retentionTimer = setInterval(() => { void runSweep(); }, intervalMs);
    // Never hold the process open just for housekeeping.
    if (typeof this.retentionTimer.unref === 'function') this.retentionTimer.unref();

    logger.info(
      `Workflow retention enabled: ${days} day(s), sweeping every ${Math.round(intervalMs / 60000)} minute(s)`
    );

    // First pass shortly after boot, not immediately, so startup is not perturbed.
    // Held on the instance so stop() can cancel it: a stop within the first minute
    // would otherwise fire a sweep against a stopped lifecycle manager.
    this.retentionKickoff = setTimeout(() => { void runSweep(); }, 60_000);
    if (typeof this.retentionKickoff.unref === 'function') this.retentionKickoff.unref();
  }

  /**
   * Stop the workflow runner
   */
  public async stop(): Promise<void> {
    try {
      // Stop the retention sweeper before touching the lifecycle manager it uses.
      // Both the interval AND the one-shot kickoff must be cancelled - the kickoff
      // fires 60s after boot, so a stop inside that window would otherwise sweep
      // against a stopped lifecycle manager.
      if (this.retentionTimer) {
        clearInterval(this.retentionTimer);
        this.retentionTimer = null;
      }
      if (this.retentionKickoff) {
        clearTimeout(this.retentionKickoff);
        this.retentionKickoff = null;
      }

      // Stop lifecycle manager
      if (this.lifecycleManager) {
        await this.lifecycleManager.stop();
      }

      // Stop configuration manager
      if (this.configurationManager) {
        await this.configurationManager.stop();
      }

      // Stop security manager
      if (this.securityManager) {
        await this.securityManager.stop();
      }

      // Stop scheduler
      if (this.scheduler) {
        await this.scheduler.stop();
        this.scheduler = null;
      }

      // Stop the YAML log-finalize sweeper
      if (this.yamlFinalizeTimer) {
        clearInterval(this.yamlFinalizeTimer);
        this.yamlFinalizeTimer = null;
      }
      this.yamlFinalizeWatch.clear();

      // Gracefully drain the workflow host: stops intake on all workers, awaits
      // in-flight executions up to gracefulShutdownTimeoutMs, and removes the
      // engine's process signal handlers. Idempotent.
      if (this.state.host) {
        await this.state.host.stop();
        this.setState({ host: null });
      }

      // GRACEFUL SHUTDOWN PATH (SIGTERM / SIGINT / explicit stop).
      //
      // An instance still in flight after the host drained was INTERRUPTED, not
      // terminated: the engine resumes Runnable instances on the next boot. So
      // this records an interruption note, never a termination reason — a
      // `shutdown` reason left on a run that later completes would be exactly the
      // kind of false attribution this ticket exists to remove.
      //
      // Before writing anything the registry is pruned against persisted state:
      // every entry is re-read and dropped if it is no longer live. That is the
      // guarantee that a deploy never re-labels a run that finished hours ago,
      // even if the registry still holds its id (CODE workflows are only removed
      // by the terminal sweep, which may lag or be mid-tick).
      if (this.inFlightInstances.size > 0) {
        try {
          const live = await this.pruneInFlightInstances();
          if (live.length > 0) {
            await this.terminationRecorder.recordInterruptionForMany(live, {
              code: TerminationReasonCode.SHUTDOWN,
              message: 'Process shutdown while the instance was running (SIGTERM/SIGINT or explicit stop).',
              source: 'shutdown',
              signal: 'shutdown',
            });
          }
        } catch (error) {
          logger.warn('Failed to record shutdown interruptions for in-flight instances (continuing)', error);
        }
        this.inFlightInstances.clear();
      }

      if (this.persistence) {
        // MongoDBPersistence exposes a close() method; other providers (SQLite,
        // Postgres, memory) do not, so we only call it when present.
        if (typeof (this.persistence as any).close === 'function') {
          await (this.persistence as any).close();
        }
        this.persistence = null;
      }

      // Close the Redis connection used for the distributed lock/queue (cluster mode).
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      this._isInitialized = false;
      // Clear the coalesced init promise so a subsequent initialize() re-runs.
      this._initPromise = null;
      // Remove the process-level fatal handlers: a stopped runner must not keep
      // recording against a closed persistence provider (or leak listeners).
      this.removeFatalErrorHandlers();
      this.inFlightInstances.clear();
      logger.info('WorkflowRunner stopped');
    } catch (error) {
      logger.error('Failed to stop WorkflowRunner', error);
      throw error;
    }
  }

  /**
   * Start the workflow runner
   */
  private async start(): Promise<IWorkflowStartResult> {
    try {
      const config = configureWorkflow();
      const { workflows } = this.state;
      config.useLogger(new Logger());

      this.persistence = await this.getPersistenceProvider();
      if (this.persistence) {
        config.usePersistence(this.persistence);
      }

      // Lock + queue topology. The engine refuses to pair durable persistence with the
      // in-process single-node lock/queue unless we opt in, because a second instance
      // would double-execute workflows. WORKFLOW_CLUSTER_MODE=true wires a distributed
      // Redis lock + reliable queue (safe to run many instances); otherwise we stay
      // single-node and explicitly allow it (single-instance deployments).
      if (WORKFLOW_CLUSTER_ENABLED) {
        logger.info('Workflow host: cluster mode — using Redis distributed lock + queue');
        this.redis = new Redis({
          host: REACTORY_REDIS_HOST,
          port: parseInt(REACTORY_REDIS_PORT, 10),
          password: REACTORY_REDIS_PASSWORD,
          db: parseInt(REACTORY_REDIS_DB, 10),
        });
        config.useQueueManager(new RedisQueueProvider(this.redis));
        config.useLockManager(new RedisLockManager(this.redis));
      } else {
        logger.info('Workflow host: single-node mode (in-process lock + queue). Set WORKFLOW_CLUSTER_MODE=true for multi-instance.');
        config.allowSingleNodeProviders(true);
      }

      const host = config.getHost();
      const autoStart: IWorkflow[] = [];
      
      for (const workflow of workflows) {
        try {
          if (workflow.workflowType === 'YAML') {
            // YAML workflows are bridged to the workflow-es host via a generated
            // workflow class (see YamlFlowBuilder), so they run through the same
            // durable engine as code workflows.
            this.registerYamlWorkflowOnHost(workflow, host);
          } else {
            logger.debug(`Registering workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} in host`, { __type: typeof workflow });
            host.registerWorkflow(workflow.component);
          }
          if (workflow.autoStart === true) {
            autoStart.push(workflow);
          }
        } catch (error) {
          logger.error(`Failed to register workflow ${workflow.name}`, error);
          // Continue with other workflows
        }
      }
      
      // NOTE: host.start() is deliberately NOT called here. Starting the host
      // begins the worker, which resumes persisted *runnable* instances. Those
      // instances may be backed by catalog YAML workflows that are only bridged
      // later in initialize() (discoverCatalogWorkflows). Starting the worker now
      // would race that registration and dead-letter such instances with
      // "definition not registered on load". initialize() starts the host only
      // after every definition (code, declared YAML, and catalog YAML) is
      // registered.
      return { host, autoStart };
    } catch (error) {
      logger.error('Error starting workflow', error);
      throw error;
    }
  }

  /**
   * Start a specific workflow with enhanced error handling.
   * Routes YAML workflows to YamlWorkflowExecutor and CODE workflows to the workflow-es host.
   */
  public async startWorkflow(id: string, version: string, data: any, context?: Reactory.Server.IReactoryContext, identity?: { userEmail?: string; partnerKey?: string }): Promise<any> {
    // Check if this is a YAML workflow
    const workflow = this.state.workflows.find(w => {
      const workflowId = `${w.nameSpace}.${w.name}@${w.version}`;
      return workflowId === id || w.name === id;
    });

    if (workflow?.workflowType === 'YAML') {
      return this.startYamlWorkflow(workflow, data, context, identity);
    }

    const errorContext: IErrorContext = {
      workflowId: id,
      version,
      attempt: 1,
      maxAttempts: 3,
      timestamp: new Date(),
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      originalError: new Error('Unknown error'),
      metadata: { data },
    };

    // M11 — the engine takes the semantic version verbatim. The former truncation to a
    // major integer is gone: it collapsed 1.0.0 / 1.2.0 / 1.9.7 to the same engine
    // version, so every persisted instance reported "1" regardless of what it ran.

    try {
      if (!this.state.host) {
        throw new Error('Workflow host not initialized');
      }

      return await this.errorHandler.executeWithRetry(
        async () => {
          const startResult = await this.state.host!.startWorkflow(id, version, data);
          logger.debug(`Workflow ${id}@${version} started successfully`, startResult);
          // Type-guard: the engine returns an instance id, but a mocked/older host
          // may return a non-string. Never let bookkeeping break a workflow start.
          if (typeof startResult === 'string') {
            // CODE workflows were previously only ADDED to the in-flight map and
            // never removed (the finalize sweep only watched YAML instances), so
            // the map grew for the process lifetime and every deploy re-labelled
            // long-finished runs. trackInFlightInstance now also schedules the
            // terminal sweep, which prunes either kind.
            this.trackInFlightInstance(startResult, id);
          }
          return startResult;
        },
        errorContext
      );
    } catch (error) {
      logger.error(`Failed to start workflow ${id}@${version}`, error);
      throw error;
    }
  }

  /**
   * Resolve the parsed YAML definition for a workflow, lazily parsing it from
   * disk (workflow.location) when props has no steps, and caching it back.
   */
  private resolveYamlDefinition(workflow: IWorkflow): YamlWorkflowDefinition {
    const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
    let definition = workflow.props as YamlWorkflowDefinition;

    // Lazily parse the YAML file from disk when props has no steps (catalog-discovered workflows)
    if ((!definition || !definition.steps) && workflow.location) {
      const parser = new YamlFlowParser({ validateSchema: false });
      const parseResult = parser.parseFromFile(workflow.location);
      if (!parseResult.success || !parseResult.workflow || !parseResult.workflow.steps) {
        const errMsgs = parseResult.errors.map(e => e.message).join(', ');
        throw new Error(
          `YAML workflow ${workflowId} could not be parsed from '${workflow.location}': ${errMsgs || 'unknown parse error'}`
        );
      }
      definition = parseResult.workflow;
      // Cache parsed definition back so subsequent runs avoid re-reading the file
      workflow.props = definition;
    }

    if (!definition || !definition.steps) {
      throw new Error(
        `YAML workflow ${workflowId} has no valid definition (missing steps). Check that 'props' contains the parsed YAML definition.`
      );
    }
    return definition;
  }

  /**
   * Build the generated workflow-es class for a YAML workflow and register it
   * with the host. Idempotent — safe to call from both host start and dynamic
   * (post-start) registration.
   */
  private registerYamlWorkflowOnHost(workflow: IWorkflow, host: IWorkflowHost): void {
    const definition = this.resolveYamlDefinition(workflow);
    const engineId = engineWorkflowId(definition);
    if (this.registeredYamlIds.has(engineId)) {
      return;
    }
    const WorkflowClass = buildYamlWorkflowClass(definition);
    host.registerWorkflow(WorkflowClass as any);
    this.registeredYamlIds.add(engineId);
    logger.debug(`Bridged YAML workflow ${engineId} onto the workflow-es host`);
  }

  /**
   * Build the initial engine workflow data (TData) for a YAML run. Everything
   * here must be JSON-serializable: identity is carried so a Reactory context
   * can be rebuilt per step at run time (durable-safe).
   */
  private buildYamlWorkflowData(
    definition: YamlWorkflowDefinition,
    input: any,
    ctx: Reactory.Server.IReactoryContext,
    identityOverride?: { userEmail?: string; partnerKey?: string },
  ): Record<string, any> {
    return {
      inputs: applyYamlInputDefaults(definition.inputs as any, input),
      variables: {},
      stepResults: {},
      env: {},
      outputs: {},
      // `identityOverride` (e.g. a schedule's `runAs` user) wins over the start
      // context. Every step rebuilds its Reactory context from this identity via
      // createWorkflowContext(), so services, role checks and AI agent tools all
      // execute as that user. Falls back to the start-context user when absent.
      __identity: {
        userEmail: identityOverride?.userEmail || (ctx?.user as any)?.email,
        partnerKey: identityOverride?.partnerKey || (ctx?.partner as any)?.key,
      },
      __workflow: {
        id: engineWorkflowId(definition),
        instanceId: '',
        nameSpace: definition.nameSpace,
        name: definition.name,
        version: definition.version,
      },
    };
  }

  /**
   * Start a YAML workflow through the workflow-es durable engine.
   *
   * Replaces the former standalone YamlWorkflowExecutor path: the YAML
   * definition is bridged to a generated workflow class (see YamlFlowBuilder),
   * so control flow, persistence, replay and scheduling are handled natively by
   * the engine — exactly like code workflows. Returns the engine instance id.
   */
  private async startYamlWorkflow(
    workflow: IWorkflow,
    data: any,
    context?: Reactory.Server.IReactoryContext,
    identityOverride?: { userEmail?: string; partnerKey?: string },
  ): Promise<string> {
    if (!this.state.host) {
      throw new Error('Workflow host not initialized');
    }
    const definition = this.resolveYamlDefinition(workflow);
    this.registerYamlWorkflowOnHost(workflow, this.state.host);

    const engineId = engineWorkflowId(definition);
    // M11 — the definition's semantic version is the engine version, verbatim.
    const version = definition.version;
    const ctx = context || this.context;
    const tenantId = (ctx?.partner as any)?.key || undefined;

    // The GraphQL startWorkflow mutation wraps the caller payload inside
    // WorkflowExecutionInput.input. Unwrap it so a workflow's `${input.X}`
    // references resolve naturally. Direct/AMQ callers pass the payload as-is.
    const payload =
      data && typeof data === 'object' && !Array.isArray(data) && data.input !== undefined
        ? data.input
        : data;
    const tdata = this.buildYamlWorkflowData(definition, payload, ctx, identityOverride);

    const instanceId = await this.state.host.startWorkflow(engineId, version, tdata, tenantId);
    logger.info(`YAML workflow ${engineId} started via engine (instance: ${instanceId})`);

    // Ensure the per-instance log manager is finalized when the run ends —
    // including failures (the in-graph FinalizeStepBody only covers success) —
    // and that the in-flight entry is dropped as soon as the run is terminal.
    this.trackInFlightInstance(instanceId, engineId);

    return instanceId;
  }

  /**
   * Watch a running YAML instance and finalize/close its InstanceResourceManager
   * once it reaches a terminal state (Complete or Terminated). This guarantees the
   * log manager is always closed — on success and on step failure — without
   * wrapping the workflow graph (which would break suspend/resume semantics).
   *
   * Requires a durable persistence provider to read instance status; in
   * in-memory mode the success path is still closed in-graph by FinalizeStepBody.
   */
  private scheduleYamlFinalize(instanceId: string): void {
    if (!this.persistence || !instanceId) {
      return;
    }
    this.yamlFinalizeWatch.add(instanceId);
    if (!this.yamlFinalizeTimer) {
      this.yamlFinalizeTimer = setInterval(() => {
        void this.sweepYamlFinalize();
      }, 5000);
      // Don't keep the event loop alive solely for this sweeper.
      if (typeof this.yamlFinalizeTimer.unref === 'function') {
        this.yamlFinalizeTimer.unref();
      }
    }
  }

  /**
   * Sweep watched instances; finalize the YAML log manager for any that have
   * reached a terminal state and drop them from BOTH the watch set and the
   * in-flight registry.
   *
   * Despite the historical name this is not YAML-only: `trackInFlightInstance()`
   * schedules every started instance (CODE workflows included), because a
   * registry entry that is never removed is how a deploy came to re-label
   * long-finished runs as SHUTDOWN. Stops the timer when nothing remains.
   */
  private async sweepYamlFinalize(): Promise<void> {
    if (this.yamlFinalizeWatch.size === 0) {
      if (this.yamlFinalizeTimer) {
        clearInterval(this.yamlFinalizeTimer);
        this.yamlFinalizeTimer = null;
      }
      return;
    }

    for (const instanceId of Array.from(this.yamlFinalizeWatch)) {
      try {
        const finalized = await finalizeInstanceIfTerminal(this.persistence, instanceId);
        if (finalized) {
          this.yamlFinalizeWatch.delete(instanceId);
          this.inFlightInstances.delete(instanceId);
          // A terminated publish-path run that reported a worktree gets a salvage
          // record, so its work is recoverable instead of silently discarded.
          try {
            await this.terminationRecorder.captureSalvageForTerminatedInstance(instanceId);
          } catch (error) {
            logger.debug(`Salvage capture failed for ${instanceId} (non-fatal): ${error instanceof Error ? error.message : error}`);
          }
        }
      } catch (err) {
        logger.debug(`YAML finalize sweep error for ${instanceId}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // ============================================
  // Termination reasons, salvage and last activity
  // ============================================

  /**
   * Remember that this process is running an engine instance, so a signal or a
   * fatal error can record a reason for it. O(1); bounded by concurrency.
   *
   * Also schedules the terminal sweep for the id, so a run that COMPLETES is
   * removed from the registry promptly instead of lingering until the process
   * exits. That was the gap that let a deploy rewrite finished runs as SHUTDOWN.
   */
  private trackInFlightInstance(instanceId: string, workflowId: string): void {
    if (!instanceId) return;
    try {
      this.inFlightInstances.set(instanceId, { workflowId, startedAt: new Date() });
      this.scheduleYamlFinalize(instanceId);
    } catch {
      /* bookkeeping must never break a workflow start */
    }
  }

  /**
   * Re-read every registered in-flight instance and drop the ones that are no
   * longer live (Complete / Terminated / DeadLettered / gone).
   *
   * Bounded by concurrency — one read per tracked instance — and only used on the
   * paths that are about to write something (shutdown, crash). It makes the
   * registry's accuracy irrelevant to correctness: even if a completed run is
   * still registered, it is never re-labelled.
   */
  private async pruneInFlightInstances(): Promise<string[]> {
    const live: string[] = [];
    for (const instanceId of Array.from(this.inFlightInstances.keys())) {
      let instance: any = null;
      try {
        instance = this.persistence ? await this.persistence.getWorkflowInstance(instanceId) : null;
      } catch (error) {
        // Unreadable: we cannot write anything for it anyway, so drop it — but say
        // so, because swallowing this silently is how a missing import turns into
        // "no reason was recorded" instead of a loud failure.
        logger.warn(`Could not re-read in-flight instance ${instanceId}; dropping it from the shutdown set`, error);
        this.inFlightInstances.delete(instanceId);
        continue;
      }

      if (!instance) {
        this.inFlightInstances.delete(instanceId);
        continue;
      }

      if (isEngineTerminalStatus(instance.status)) {
        // The run is finished; the terminal sweep / read layer owns it now.
        this.inFlightInstances.delete(instanceId);
        this.yamlFinalizeWatch.delete(instanceId);
        continue;
      }

      live.push(instanceId);
    }
    return live;
  }

  /** Engine instance ids currently in flight in this process (for metrics/tests). */
  public getInFlightInstanceIds(): string[] {
    return Array.from(this.inFlightInstances.keys());
  }

  /**
   * Record a termination reason for an instance from outside the engine (a
   * workflow step that knows it is about to give up, an orchestrator, an
   * operator). Best-effort: returns false when nothing could be written.
   */
  public async recordTerminationReason(
    instanceId: string,
    input: {
      code: TerminationReasonCode | string;
      message?: string | null;
      time?: Date | string | number | null;
    },
  ): Promise<boolean> {
    const outcome = await this.terminationRecorder.recordTermination(
      instanceId,
      { code: input.code, message: input.message, time: input.time, source: 'owner' },
      // A workflow step calling this knows it is giving up on the run, i.e. it is
      // the transition. A COMPLETE instance is still never relabelled.
      { force: true, terminal: true },
    );
    return outcome.applied;
  }

  /**
   * Subscribe to the engine's lifecycle events.
   *
   * `workflow.dead-lettered` is the ONLY terminal transition the engine
   * announces, and a DeadLettered instance (status 4) is displayed as
   * TERMINATED. Before this subscription that path recorded nothing at all —
   * one of the two silent paths named in the ticket.
   *
   * Handlers run synchronously and must not throw (the engine swallows, but a
   * throw here would hide the event). The persistence write is fire-and-forget:
   * the engine emits BEFORE it persists the dead-lettered status, so the recorder
   * is told `terminal: true` and handles the optimistic-concurrency retry.
   */
  private subscribeToEngineLifecycleEvents(host: IWorkflowHost): void {
    try {
      if (!host || typeof (host as any).onLifecycleEvent !== 'function') {
        logger.debug('Workflow host does not expose lifecycle events; dead-letter reasons will be derived on read');
        return;
      }

      (host as any).onLifecycleEvent((event: any) => {
        try {
          if (!event || event.event !== 'workflow.dead-lettered') return;
          const instanceId = event.workflowId;
          if (!instanceId) return;

          this.inFlightInstances.delete(instanceId);
          const { code, message } = classifyDeadLetterReason(event.reason, event.errorMessage);

          void this.terminationRecorder
            .recordTermination(
              instanceId,
              { code, message, time: event.deadLetteredAt || new Date(), source: 'dead-letter' },
              // The engine emits BEFORE persisting the dead-lettered status, so
              // the reload may still show Runnable: this caller IS the transition.
              { force: true, terminal: true },
            )
            .catch(() => undefined);
        } catch (error) {
          logger.debug(`Failed to handle a workflow lifecycle event: ${error instanceof Error ? error.message : error}`);
        }
      });
    } catch (error) {
      logger.warn('Failed to subscribe to engine lifecycle events (dead-letter reasons will be derived on read)', error);
    }
  }

  /**
   * Install the process-level fatal handlers.
   *
   * WHY: `grep -rn 'uncaughtException|unhandledRejection' src/` found exactly one
   * handler in the server (`unhandledRejection` -> log -> `process.exit(0)`), and
   * none for `uncaughtException`. An agent step whose promise rejected therefore
   * killed the process with exit code 0 and left a Terminated instance with no
   * reason, no completeTime and no error. This is the most likely mechanism
   * behind the incident.
   *
   * EXIT CONTRACT — deliberately unchanged:
   *  - listeners are added with `prependListener`, so this runs BEFORE the
   *    server's existing handler and can record while the event loop is alive;
   *  - nothing here calls `process.exit()` when another listener exists: that
   *    listener owns the outcome (server.ts exits 0 on an unhandled rejection,
   *    and under Electron it deliberately does not exit);
   *  - if this is the ONLY listener, Node's default behaviour (print the stack,
   *    exit non-zero) is reproduced exactly, so a crash can never become a hang;
   *  - the recording itself is a synchronous file append (see
   *    TerminationOutbox) because no asynchronous write survives `process.exit()`.
   */
  private installFatalErrorHandlers(): void {
    if (this.fatalErrorHandlers) return;
    if (typeof process === 'undefined' || typeof process.prependListener !== 'function') return;

    // Exactly one owner at a time (see fatalHandlerOwner).
    if (fatalHandlerOwner && fatalHandlerOwner !== this) {
      fatalHandlerOwner.removeFatalErrorHandlers();
    }

    const uncaught = (error: any) => this.handleFatalError('uncaughtException', error);
    const rejection = (error: any) => this.handleFatalError('unhandledRejection', error);

    try {
      process.prependListener('uncaughtException', uncaught);
      process.prependListener('unhandledRejection', rejection);
      this.fatalErrorHandlers = { uncaught, rejection };
      fatalHandlerOwner = this;
      logger.debug('Installed workflow process-level fatal error handlers');
    } catch (error) {
      logger.warn('Failed to install workflow fatal error handlers', error);
    }
  }

  /** Remove the process-level handlers (called from stop()). */
  private removeFatalErrorHandlers(): void {
    if (!this.fatalErrorHandlers) return;
    try {
      process.removeListener('uncaughtException', this.fatalErrorHandlers.uncaught);
      process.removeListener('unhandledRejection', this.fatalErrorHandlers.rejection);
    } catch {
      /* best-effort */
    }
    this.fatalErrorHandlers = null;
    if (fatalHandlerOwner === this) fatalHandlerOwner = null;
  }

  /**
   * Body of the fatal handlers. Public and parameterised so a test can drive the
   * crash path without taking the test runner down with it.
   *
   * @param options.exit Injection point for the process-exit step (defaults to
   *   `process.exit`). Tests pass a jest mock.
   */
  public handleFatalError(
    kind: 'uncaughtException' | 'unhandledRejection',
    error: any,
    options: { exit?: (code: number) => void } = {},
  ): void {
    let queued = 0;

    try {
      const code = classifyTerminationError(error);
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      const ids = Array.from(this.inFlightInstances.keys());

      // Queue for EVERY registered id — the drain re-reads each instance and
      // discards the ones that turned out to be finished, so a stale registry
      // entry cannot become a false reason. Nothing is written here because no
      // async write survives the process.exit() that follows.
      if (ids.length > 0) {
        queued = this.terminationRecorder.queueProcessTermination(ids, {
          code,
          message: `${kind}: ${detail}`,
          source: 'process',
          signal: kind,
        });
      }

      logger.error(
        `Fatal ${kind} observed by the workflow engine; queued ${queued}/${ids.length} termination reason(s)`,
        { code, instanceIds: ids },
      );
    } catch (recordingError) {
      // A failure to RECORD must never replace the failure being recorded.
      try {
        logger.error('Failed to queue termination reasons for a fatal error', recordingError);
      } catch {
        /* ignore */
      }
    }

    // Preserve the exit contract — see installFatalErrorHandlers().
    try {
      if (process.listenerCount(kind) <= 1) {
        const exit = options.exit || ((code: number) => process.exit(code));
        // eslint-disable-next-line no-console
        console.error(error);
        exit(1);
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Record work that a terminated run may have left behind in a worktree.
   *
   * The engine does not run `git` (layering): the workflow that owns the worktree
   * reports the facts, the engine persists them and refuses to let the record be
   * deleted until it is resolved.
   */
  public async recordWorktreeSalvage(
    instanceId: string,
    input: ISalvageRecordInput,
  ): Promise<IWorkflowSalvageRecord | null> {
    return this.terminationRecorder.recordSalvage(instanceId, input);
  }

  /**
   * Resolve a salvage record: either the work was committed (`salvageSha`) or
   * published (`publishedSha`), or an operator explicitly accepts its loss.
   */
  public async acknowledgeWorktreeSalvage(
    instanceId: string,
    input: {
      acknowledgedBy?: string | null;
      note?: string | null;
      salvageSha?: string | null;
      publishedSha?: string | null;
    } = {},
  ): Promise<IWorkflowSalvageRecord | null> {
    return this.terminationRecorder.acknowledgeSalvage(instanceId, input);
  }

  /** Read the salvage record for an instance (null when there is none). */
  public async getSalvageRecord(instanceId: string): Promise<IWorkflowSalvageRecord | null> {
    return this.terminationRecorder.getSalvage(instanceId);
  }

  /**
   * Guard to call before removing a worktree (or otherwise discarding a
   * terminated run's artefacts). Throws `UnresolvedSalvageError` while the record
   * is unresolved.
   */
  public async assertSalvageClear(instanceId: string): Promise<IWorkflowSalvageRecord | null> {
    return this.terminationRecorder.assertSalvageClear(instanceId);
  }

  /** The underlying recorder (used by tests and by the service layer). */
  public getTerminationRecorder(): WorkflowInstanceLifecycleRecorder {
    return this.terminationRecorder;
  }

  /**
   * Get current state
   */
  public getState(): IWorkflowState {
    return { ...this.state };
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Get the scheduler instance
   */
  public getScheduler(): WorkflowScheduler | null {
    return this.scheduler;
  }

  /**
   * Reload scheduler schedules
   */
  public async reloadSchedules(): Promise<void> {
    if (this.scheduler) {
      await this.scheduler.reloadSchedules();
    }
  }

  /**
   * Scan the YAML catalog directory for workflow definitions that are not
   * yet registered in the runner.  The catalog layout is:
   *   $REACTORY_DATA/workflows/catalog/<namespace>/<name>/<version>/<name>.yaml
   *
   * Any discovered workflow that does not already have a matching registration
   * (by namespace + name + version) is added to the in-memory registry so it
   * survives server restarts without requiring a module declaration.
   */
  private async discoverCatalogWorkflows(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const reactoryData = process.env.REACTORY_DATA;
      if (!reactoryData) {
        logger.debug('REACTORY_DATA not set — skipping catalog workflow discovery');
        return;
      }

      const catalogRoot = path.join(reactoryData, 'workflows', 'catalog');
      if (!fs.existsSync(catalogRoot)) {
        logger.debug(`Catalog directory ${catalogRoot} does not exist — skipping discovery`);
        return;
      }

      let discoveredCount = 0;
      let skippedCount = 0;

      // Level 1: namespace directories
      const namespaceDirs = fs.readdirSync(catalogRoot, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const nsDir of namespaceDirs) {
        const nameSpace = nsDir.name;
        const nsPath = path.join(catalogRoot, nameSpace);

        // Level 2: workflow name directories
        const nameDirs = fs.readdirSync(nsPath, { withFileTypes: true })
          .filter(d => d.isDirectory());

        for (const nameDir of nameDirs) {
          const name = nameDir.name;
          const namePath = path.join(nsPath, name);

          // Level 3: version directories
          const versionDirs = fs.readdirSync(namePath, { withFileTypes: true })
            .filter(d => d.isDirectory());

          for (const verDir of versionDirs) {
            const version = verDir.name;
            const yamlFile = path.join(namePath, version, `${name}.yaml`);
            const ymlFile = path.join(namePath, version, `${name}.yml`);
            const targetFile = fs.existsSync(yamlFile) ? yamlFile : (fs.existsSync(ymlFile) ? ymlFile : null);

            if (!targetFile) continue;

            // Skip if already registered (module-provisioned or previously discovered)
            const existing = this.getWorkflowByName(nameSpace, name, version);
            if (existing) {
              skippedCount++;
              continue;
            }

            try {
              this.registerWorkflow({
                nameSpace,
                name,
                version,
                workflowType: 'YAML',
                location: targetFile,
                component: null,
                category: 'catalog',
                isActive: true,
                props: {},
              });
              discoveredCount++;
            } catch (regErr) {
              logger.warn(
                `Failed to register catalog workflow ${nameSpace}.${name}@${version}: ${
                  regErr instanceof Error ? regErr.message : String(regErr)
                }`
              );
            }
          }
        }
      }

      if (discoveredCount > 0 || skippedCount > 0) {
        logger.info(
          `Catalog workflow discovery complete: ${discoveredCount} registered, ${skippedCount} already known`
        );
      }
    } catch (err) {
      logger.error(
        `Error during catalog workflow discovery: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }

  /**
   * Get all registered workflows
   */
  public getRegisteredWorkflows(): IWorkflow[] {
    return [...this.state.workflows];
  }

  /**
   * Get registered workflow by namespace and name
   *
   * When a version is supplied the match is exact. When it is NOT supplied this
   * returns the NEWEST registered version, not merely the first match.
   *
   * Why that matters: the registry keeps every version ever registered, in
   * registration order. A plain `find` therefore returned the OLDEST version
   * for a bare name lookup, so `core.ProcessAITicket` resolved to 1.4.2 while
   * 1.4.3 was the version being shipped - every caller that addressed the
   * workflow by name silently ran (or reported) a stale definition. Launching
   * an old definition looks healthy: no error, just the wrong behaviour.
   */
  public getWorkflowByName(nameSpace: string, name: string, version?: string): IWorkflow | undefined {
    return selectWorkflowByName(this.state.workflows, nameSpace, name, version);
  }

  /**
   * Get workflows by namespace
   */
  public getWorkflowsByNamespace(nameSpace: string): IWorkflow[] {
    return this.state.workflows.filter(workflow => workflow.nameSpace === nameSpace);
  }

  /**
   * Get workflow by ID
   */
  public getWorkflowWithId(id: string): IWorkflow | undefined {
    let workflow: IWorkflow | undefined = this.state.workflows.find(workflow => {
      const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
      return workflowId === id;
    });
    if(!workflow) {
      return undefined;
    }
    
    return {
      ...workflow,
      status: 'ACTIVE',
      errors: [],
      statistics: {
        
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      },
    }
  }
  /**
   * Get workflow statistics
   **/
  public getWorkflowStats(): {
    totalWorkflows: number;
    workflowsByNamespace: Record<string, number>;
    workflowsByCategory: Record<string, number>;
    autoStartWorkflows: number;
  } {
    const workflows = this.state.workflows;
    const workflowsByNamespace: Record<string, number> = {};
    const workflowsByCategory: Record<string, number> = {};
    let autoStartWorkflows = 0;

    workflows.forEach(workflow => {
      // Count by namespace
      workflowsByNamespace[workflow.nameSpace] = (workflowsByNamespace[workflow.nameSpace] || 0) + 1;
      
      // Count by category
      workflowsByCategory[workflow.category] = (workflowsByCategory[workflow.category] || 0) + 1;
      
      // Count auto-start workflows
      if (workflow.autoStart) {
        autoStartWorkflows++;
      }
    });

    return {
      totalWorkflows: workflows.length,
      workflowsByNamespace,
      workflowsByCategory,
      autoStartWorkflows
    };
  }

  /**
   * Get error statistics for a workflow
   */
  public getErrorStats(workflowId: string): IWorkflowErrorStats | undefined {
    return this.errorHandler.getErrorStats(workflowId);
  }

  /**
   * Get circuit breaker state for a workflow
   */
  public getCircuitBreakerState(workflowId: string): string | undefined {
    return this.errorHandler.getCircuitBreakerState(workflowId);
  }

  /**
   * Reset circuit breaker for a workflow
   */
  public resetCircuitBreaker(workflowId: string): void {
    this.errorHandler.resetCircuitBreaker(workflowId);
  }

  /**
   * Get all error statistics
   */
  public getAllErrorStats(): Map<string, IWorkflowErrorStats> {
    return this.errorHandler.getAllErrorStats();
  }

  /**
   * Clear error statistics
   */
  public clearErrorStats(): void {
    this.errorHandler.clearErrorStats();
  }

  // Lifecycle Management Methods

  /**
   * Create a workflow instance with lifecycle management
   */
  public createWorkflowInstance(
    workflowId: string,
    version: string,
    priority: WorkflowPriority = WorkflowPriority.NORMAL,
    dependencies: IWorkflowDependency[] = [],
    metadata?: Record<string, any>
  ): IWorkflowInstance {
    return this.lifecycleManager.createWorkflowInstance(workflowId, version, priority, dependencies, metadata);
  }

  /**
   * Start a workflow instance
   */
  public async startWorkflowInstance(instanceId: string): Promise<void> {
    return this.lifecycleManager.startWorkflow(instanceId);
  }

  /**
   * Pause a workflow instance
   */
  public pauseWorkflowInstance(instanceId: string): void {
    this.lifecycleManager.pauseWorkflow(instanceId);
  }

  /**
   * Resume a workflow instance
   */
  public resumeWorkflowInstance(instanceId: string): void {
    this.lifecycleManager.resumeWorkflow(instanceId);
  }

  /**
   * Complete a workflow instance
   */
  public completeWorkflowInstance(instanceId: string, result?: any): void {
    this.lifecycleManager.completeWorkflow(instanceId, result);
  }

  /**
   * Fail a workflow instance
   */
  public failWorkflowInstance(instanceId: string, error: Error): void {
    this.lifecycleManager.failWorkflow(instanceId, error);
  }

  /**
   * Cancel (abort/stop) a workflow instance.
   *
   * YAML and code workflows execute on the workflow-es host, so we terminate the
   * running engine instance (sets it to Terminated, stopping further step
   * execution / any runaway loop). We also notify the in-memory lifecycle manager
   * for any non-engine/legacy instance it tracks (best-effort).
   */
  public async cancelWorkflowInstance(instanceId: string, reason?: string): Promise<void> {
    let terminated = false;
    if (this.state.host) {
      try {
        terminated = await this.state.host.terminateWorkflow(instanceId);
        logger.info(`Terminated workflow instance ${instanceId} (engine): ${terminated}`);
      } catch (err) {
        logger.warn(
          `Failed to terminate engine workflow instance ${instanceId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    this.inFlightInstances.delete(instanceId);

    // THE CANCELLED PATH. `host.terminateWorkflow()` only sets status =
    // Terminated: no completeTime, no error, no reason. An operator cancel was
    // therefore indistinguishable from a crash or an OOM in the history view.
    if (terminated) {
      try {
        await this.terminationRecorder.recordTermination(
          instanceId,
          {
            code: TerminationReasonCode.CANCELLED,
            message: reason ? `Cancelled: ${reason}` : 'Cancelled by an operator.',
            source: 'cancel',
          },
          // `host.terminateWorkflow()` has just set Terminated, so this caller IS
          // the transition. A COMPLETE run is still never relabelled (the guard
          // checks status 2 first).
          { force: true, terminal: true },
        );
      } catch (error) {
        logger.warn(`Failed to record cancellation reason for ${instanceId}`, error);
      }
    }

    // Best-effort lifecycle-manager update (no-op / not-found for engine instances).
    try {
      this.lifecycleManager.cancelWorkflow(instanceId, reason);
    } catch {
      /* engine-only instance not tracked by the lifecycle manager */
    }
  }

  /**
   * Publish an event to the workflow engine, waking any step that is waiting on
   * the given (eventName, eventKey) pair. This is the low-level signal primitive
   * that lets an operator continue a suspended WaitEvent step.
   *
   * TENANCY: instances are started under `partner.key` as their tenant (see
   * startYamlWorkflow) and the engine matches event subscriptions *strictly* by
   * tenant, so an event published under the wrong tenant is silently discarded and
   * the waiting step never resumes. The tenant therefore defaults to this runner's
   * context partner — pass `tenantId` explicitly when publishing on behalf of an
   * instance belonging to a different tenant (e.g. a background sweeper running
   * under the system context).
   *
   * @param eventName - The event name the waiting step subscribed to
   * @param eventKey  - The correlation key the waiting step subscribed with
   * @param eventData - Arbitrary payload delivered to the resumed step
   * @param eventTime - Effective event time (defaults to now)
   * @param tenantId  - Tenant owning the waiting instance (defaults to the
   *                    runner context's partner key)
   */
  public async publishEvent(
    eventName: string,
    eventKey: string,
    eventData: any,
    eventTime?: Date,
    tenantId?: string
  ): Promise<void> {
    if (!this.state.host) {
      throw new Error('Workflow host not initialized');
    }
    const effectiveTenant = tenantId || (this.context?.partner as any)?.key || undefined;
    await this.state.host.publishEvent(
      eventName,
      eventKey,
      eventData,
      eventTime || new Date(),
      effectiveTenant
    );
    logger.info(
      `Published workflow event '${eventName}' (key: ${eventKey}, tenant: ${effectiveTenant || 'default'})`
    );
  }

  /**
   * Get workflow instance by ID
   */
  public getWorkflowInstance(instanceId: string): IWorkflowInstance | undefined {
    return this.lifecycleManager.getWorkflowInstance(instanceId);
  }

  /**
   * Get all workflow instances
   */
  public getAllWorkflowInstances(): IWorkflowInstance[] {
    return this.lifecycleManager.getAllWorkflowInstances();
  }

  /**
   * Get workflows by status
   */
  public getWorkflowsByStatus(status: WorkflowStatus): IWorkflowInstance[] {
    return this.lifecycleManager.getWorkflowsByStatus(status);
  }

  /**
   * Get workflows by priority
   */
  public getWorkflowsByPriority(priority: WorkflowPriority): IWorkflowInstance[] {
    return this.lifecycleManager.getWorkflowsByPriority(priority);
  }

  /**
   * Add dependency between workflows
   */
  public addWorkflowDependency(
    dependentId: string,
    dependencyId: string,
    condition: 'completed' | 'failed' | 'any' = 'completed',
    timeout?: number
  ): void {
    this.lifecycleManager.addDependency(dependentId, dependencyId, condition, timeout);
  }

  /**
   * Remove dependency between workflows
   */
  public removeWorkflowDependency(dependentId: string, dependencyId: string): void {
    this.lifecycleManager.removeDependency(dependentId, dependencyId);
  }

  /**
   * Get workflow lifecycle statistics
   */
  public getLifecycleStats(): IWorkflowLifecycleStats {
    return this.lifecycleManager.getStats();
  }

  /**
   * Get lifecycle manager
   */
  public getLifecycleManager(): WorkflowLifecycleManager {
    return this.lifecycleManager;
  }

  // Configuration Management Methods
  public getConfiguration(workflowId: string, version: string): IWorkflowConfig | undefined {
    return this.configurationManager.getConfiguration(workflowId, version);
  }

  public async updateConfiguration(
    workflowId: string,
    version: string,
    config: Partial<IWorkflowConfig>,
    user?: string
  ): Promise<void> {
    return this.configurationManager.updateConfiguration(workflowId, version, config, user);
  }

  public async addConfiguration(config: IWorkflowConfig, user?: string): Promise<void> {
    return this.configurationManager.addConfiguration(config, user);
  }

  public async removeConfiguration(workflowId: string, version: string, user?: string): Promise<void> {
    return this.configurationManager.removeConfiguration(workflowId, version, user);
  }

  public getConfigurationStats(): IConfigurationStats {
    return this.configurationManager.getConfigurationStats();
  }

  public async reloadConfigurations(): Promise<void> {
    return this.configurationManager.reloadConfigurations();
  }

  public exportConfigurations(format: 'json' | 'yaml' = 'json'): string {
    return this.configurationManager.exportConfigurations(format);
  }

  // Security Management Methods
  public async checkWorkflowPermission(
    userId: string,
    workflowId: string,
    version: string,
    action: string = 'execute'
  ): Promise<boolean> {
    return this.securityManager.checkWorkflowPermission(userId, workflowId, version, action);
  }

  public validateInput(data: any, schema?: Record<string, any>): IInputValidationResult {
    return this.securityManager.validateInput(data, schema);
  }

  public checkRateLimit(identifier: string, limit: number, window: number) {
    return this.securityManager.checkRateLimit(identifier, limit, window);
  }

  public async logAuditEvent(
    userId: string | undefined,
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    return this.securityManager.logAuditEvent(userId, action, resource, resourceId, details, ipAddress, userAgent);
  }

  public getAuditLogs(filter?: any): any[] {
    return this.securityManager.getAuditLogs(filter);
  }

  public getSecurityEvents(filter?: any): any[] {
    return this.securityManager.getSecurityEvents(filter);
  }

  public getSecurityStats(): ISecurityStats {
    return this.securityManager.getSecurityStats();
  }

  public resolveSecurityEvent(eventId: string, resolution: string): void {
    this.securityManager.resolveSecurityEvent(eventId, resolution);
  }

  // Manager Access Methods
  public getConfigurationManager(): ConfigurationManager {
    return this.configurationManager;
  }

  public getSecurityManager(): SecurityManager {
    return this.securityManager;
  }
}
