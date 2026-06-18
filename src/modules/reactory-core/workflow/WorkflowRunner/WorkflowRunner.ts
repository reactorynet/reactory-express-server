import {
  configureWorkflow,
  IPersistenceProvider,
  ILogger,
  LogLevel,
  LogContext,
  WorkflowHost,
  WorkflowInstance,
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
import { YamlWorkflowExecutor } from '../YamlFlow/execution/YamlWorkflowExecutor';
import { YamlStepRegistry } from '../YamlFlow/steps/registry/YamlStepRegistry';
import { YamlFlowParser } from '../YamlFlow/YamlFlowParser';
import type { YamlWorkflowDefinition } from '../YamlFlow/types/WorkflowDefinition';

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
  private scheduler: WorkflowScheduler | null = null;
  private readonly errorHandler: ErrorHandler;
  private readonly lifecycleManager: WorkflowLifecycleManager;
  private readonly configurationManager: ConfigurationManager;
  private readonly securityManager: SecurityManager;   
  private readonly context: Reactory.Server.IReactoryContext;
  private stepRegistry: YamlStepRegistry;

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
      logger.warn('WorkflowRunner already initialized');
      return;
    }

    try {
      this._isStarting = true;
      const { host, autoStart } = await this.start();
      this.setState({ host });
      this._isInitialized = true;
      this._isStarting = false;

      // Discover and register workflow steps from all enabled modules
      this.discoverModuleSteps();

      // Discover YAML workflows persisted in the catalog directory that are
      // not yet registered (e.g. workflows created via the designer and saved
      // to disk but not declared in a module definition).
      await this.discoverCatalogWorkflows();

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
    const modules: Reactory.Server.IReactoryModule[] = (this.context as any).modules || [];
    let registeredCount = 0;
    for (const mod of modules) {
      if (!mod.workflowSteps || !Array.isArray(mod.workflowSteps)) continue;
      for (const stepProvider of mod.workflowSteps) {
        try {
          this.stepRegistry.registerStep(
            stepProvider.stepType,
            stepProvider.constructor as any,
            stepProvider.options || {}
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
        return !!(workflow.props);
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
        // YAML workflows don't register with workflow-es host
        logger.debug(`Adding YAML workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} to registry`);
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
            // YAML workflows are executed via YamlWorkflowExecutor, not the workflow-es host.
            // They don't have a component class to register.
            logger.debug(`Registered YAML workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} (skipping workflow-es host)`);
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
      
      await host.start();
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
      return this.executeYamlWorkflow(workflow, data, context);
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

    let versionNumber = 1;
    if (version && typeof version === 'string') {
      try {
        if (version.includes('.')) {
          versionNumber = parseInt(version.split('.')[0]);
        } else {
          versionNumber = parseInt(version);
        }
      } catch (error) {
        logger.warn(`Invalid version number ${version} for workflow ${id}, using default 1`, error);
      }
    }

    try {
      if (!this.state.host) {
        throw new Error('Workflow host not initialized');
      }

      return await this.errorHandler.executeWithRetry(
        async () => {
          const startResult = await this.state.host!.startWorkflow(id, versionNumber, data);
          logger.debug(`Workflow ${id} :${versionNumber} started successfully`, startResult);
          return startResult;
        },
        errorContext
      );
    } catch (error) {
      logger.error(`Failed to start workflow ${id} :${versionNumber}`, error);
      throw error;
    }
  }

  /**
   * Execute a YAML workflow via YamlWorkflowExecutor with full lifecycle tracking.
   * Creates a lifecycle instance, runs the YAML definition through the executor,
   * and updates the instance status on completion or failure.
   */
  private async executeYamlWorkflow(
    workflow: IWorkflow,
    data: any,
    context?: Reactory.Server.IReactoryContext
  ): Promise<string> {
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
      throw new Error(`YAML workflow ${workflowId} has no valid definition (missing steps). Check that 'props' contains the parsed YAML definition.`);
    }

    // Create a lifecycle instance so the execution is tracked
    const instance = this.lifecycleManager.createWorkflowInstance(
      workflowId,
      workflow.version,
      WorkflowPriority.NORMAL,
      [],
      { workflowType: 'YAML', input: data }
    );

    // Transition to RUNNING
    await this.lifecycleManager.startWorkflow(instance.id);

    const reactoryCtx = context || this.context;
    const executor = new YamlWorkflowExecutor(this.stepRegistry, reactoryCtx);

    try {
      const result = await executor.executeWorkflow(definition, {
        inputs: data,
        reactoryContext: reactoryCtx,
      });

      if (result.success) {
        this.lifecycleManager.completeWorkflow(instance.id, result.outputs);
        logger.info(`YAML workflow ${workflowId} completed successfully (instance: ${instance.id})`);
      } else {
        // Aggregate all errors for better diagnostics
        const allErrors = result.errors || (result.error ? [result.error] : []);
        const errorSummary = allErrors.map(
          (e: any) => `[${e.stepId || 'workflow'}] ${e.message}`
        ).join('\n  ');
        const error = new Error(
          `YAML workflow ${workflowId} failed:\n  ${errorSummary}`
        );
        this.lifecycleManager.failWorkflow(instance.id, error);
        logger.error(`YAML workflow ${workflowId} failed (instance: ${instance.id}):\n  ${errorSummary}`);
        if (result.executedSteps) {
          const failedSteps = result.executedSteps.filter((s: any) => !s.success);
          for (const fs of failedSteps) {
            logger.error(`  Step '${fs.stepId}' (${fs.stepType}): ${fs.error?.message || 'unknown error'}`);
          }
        }
      }

      // Persist to MongoDB so the execution appears in history
      await this.persistYamlExecution(instance, workflowId, result, data);

      return instance.id;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.lifecycleManager.failWorkflow(instance.id, err);
      logger.error(`YAML workflow ${workflowId} threw an exception (instance: ${instance.id})`, error);
      throw error;
    }
  }

  /**
   * Persist a YAML workflow execution through the active IPersistenceProvider
   * so it appears in execution history for any configured store (M9 Phase 2).
   *
   * If no persistence provider is configured, the execution is skipped/logged
   * (same tolerant behaviour as before).
   */
  private async persistYamlExecution(
    instance: IWorkflowInstance,
    workflowDefinitionId: string,
    result: any,
    inputData: any
  ): Promise<void> {
    if (!this.persistence) {
      logger.debug(
        `persistYamlExecution: no persistence provider — skipping history record for ${instance.id}`
      );
      return;
    }

    try {
      // Map in-memory WorkflowStatus → engine numeric status
      // engine: Runnable=0, Suspended=1, Complete=2, Terminated=3
      const statusMap: Record<string, number> = {
        [WorkflowStatus.PENDING]:     0, // Runnable
        [WorkflowStatus.RUNNING]:     0, // Runnable
        [WorkflowStatus.COMPLETED]:   2, // Complete
        [WorkflowStatus.FAILED]:      3, // Terminated
        [WorkflowStatus.CANCELLED]:   3, // Terminated
        [WorkflowStatus.PAUSED]:      1, // Suspended
        [WorkflowStatus.CLEANING_UP]: 0, // Runnable
      };

      // PointerStatus: Complete=3, Failed=6
      const executionPointers = (result.executedSteps || []).map((step: any, idx: number) => ({
        id: step.stepId || `pointer_${idx}`,
        stepId: idx,
        active: false,
        sleepUntil: 0,
        persistenceData: step.outputs || null,
        startTime: step.metadata?.startTime || null,
        endTime: step.metadata?.endTime || null,
        eventName: null,
        eventKey: null,
        eventPublished: false,
        eventData: null,
        retryCount: 0,
        children: [],
        contextItem: null,
        predecessorId: null,
        outcome: step.success ? (step.outputs || null) : null,
        status: step.success ? 3 : 6, // Complete=3, Failed=6
        scope: [],
        stepName: step.stepId || `step_${idx}`,
      }));

      const wi = new WorkflowInstance();
      wi.id = instance.id;
      wi.workflowDefinitionId = workflowDefinitionId;
      wi.version = 1;
      wi.description = 'YAML workflow execution';
      wi.status = statusMap[instance.status] ?? 0;
      wi.data = inputData || {};
      wi.createTime = instance.startedAt;
      wi.completeTime = instance.completedAt || (null as any);
      wi.executionPointers = executionPointers as any;
      wi.nextExecution = 0;
      wi.tenantId = 'default';

      await this.persistence.createNewWorkflow(wi);
      await this.persistence.persistWorkflow(wi);

      logger.debug(`Persisted YAML workflow execution via provider: ${instance.id}`);
    } catch (err) {
      // Don't fail the workflow if persistence fails — log and continue
      logger.warn(
        `Failed to persist YAML workflow execution ${instance.id}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
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
   * Cancel a workflow instance
   */
  public cancelWorkflowInstance(instanceId: string, reason?: string): void {
    this.lifecycleManager.cancelWorkflow(instanceId, reason);
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
