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

  constructor(props: IWorkflowRunnerProps, context: Reactory.Server.IReactoryContext) {
    this.state = {
      workflows: props?.workflows || getDefaultWorkflows(),
      host: null,
    };
    this.context = context;
    this.stepRegistry = new YamlStepRegistry();
    this.errorHandler = new ErrorHandler();
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

      // Initialize configuration manager
      await this.configurationManager.initialize({
        host,
      });

      // Initialize security manager
      await this.securityManager.initialize({
        host,
      });

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
   *             REACTORY_POSTGRES_URL, or POSTGRES_URL (first non-empty wins).
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
        const mongoPersistence = new MongoDBPersistence(MONGOOSE);
        await mongoPersistence.connect;
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
        const connectionString = WORKFLOW_POSTGRES_URL || REACTORY_POSTGRES_URL || POSTGRES_URL;
        if (!connectionString) {
          logger.warn(
            'WORKFLOW_PERSISTENCE_PROVIDER=postgres but no connection URL found. ' +
            'Set WORKFLOW_POSTGRES_URL (or REACTORY_POSTGRES_URL / POSTGRES_URL) — falling back to in-memory.'
          );
          return null;
        }
        const { PostgresPersistence } = await import('@reactorynet/workflow-es-postgres');
        logger.debug('Using PostgreSQL for Workflow Persistence');
        const postgresPersistence = new PostgresPersistence(connectionString);
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
   * Stop the workflow runner
   */
  public async stop(): Promise<void> {
    try {
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
  public async startWorkflow(id: string, version: string, data: any, context?: Reactory.Server.IReactoryContext): Promise<any> {
    // Check if this is a YAML workflow
    const workflow = this.state.workflows.find(w => {
      const workflowId = `${w.nameSpace}.${w.name}@${w.version}`;
      return workflowId === id || w.name === id;
    });

    if (workflow?.workflowType === 'YAML') {
      return this.startYamlWorkflow(workflow, data, context);
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
  ): Record<string, any> {
    return {
      inputs: applyYamlInputDefaults(definition.inputs as any, input),
      variables: {},
      stepResults: {},
      env: {},
      outputs: {},
      __identity: {
        userEmail: (ctx?.user as any)?.email,
        partnerKey: (ctx?.partner as any)?.key,
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
    const tdata = this.buildYamlWorkflowData(definition, payload, ctx);

    const instanceId = await this.state.host.startWorkflow(engineId, version, tdata, tenantId);
    logger.info(`YAML workflow ${engineId} started via engine (instance: ${instanceId})`);

    // Ensure the per-instance log manager is finalized when the run ends —
    // including failures (the in-graph FinalizeStepBody only covers success).
    this.scheduleYamlFinalize(instanceId);

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
   * Sweep watched YAML instances; finalize the log manager for any that have
   * reached a terminal state and drop them from the watch set. Stops the timer
   * when nothing remains to watch.
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
        }
      } catch (err) {
        logger.debug(`YAML finalize sweep error for ${instanceId}: ${err instanceof Error ? err.message : err}`);
      }
    }
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
   */
  public getWorkflowByName(nameSpace: string, name: string, version?: string): IWorkflow | undefined {
    return this.state.workflows.find(workflow => 
      workflow.nameSpace === nameSpace && 
      workflow.name === name && 
      (version ? workflow.version === version : true)
    );
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
