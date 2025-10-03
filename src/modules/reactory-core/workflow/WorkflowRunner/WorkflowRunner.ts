import { 
  configureWorkflow, 
  ConsoleLogger, 
  IPersistenceProvider,
  ILogger, 
  WorkflowHost,
} from 'workflow-es';
import { MongoDBPersistence } from 'workflow-es-mongodb';
import { isArray } from 'lodash';
import moment from 'moment';
import amq from '../../../../amq';
import reactoryModules from '../../..';
import logger from '../../../../logging';
import mongoose from 'mongoose';
import { WorkflowScheduler } from '../Scheduler/Scheduler';
import { ErrorHandler, IErrorContext, ErrorCategory, ErrorSeverity, IWorkflowErrorStats } from '../ErrorHandler/ErrorHandler';
import {
  WorkflowLifecycleManager,
  WorkflowStatus,
  WorkflowPriority,
  type IWorkflowInstance,
  type IWorkflowDependency,
  type IWorkflowLifecycleStats
} from '../LifecycleManager/LifecycleManager';
import { ConfigurationManager, IConfigurationStats, type IWorkflowConfig } from '../ConfigurationManager/ConfigurationManager';
import { ISecurityStats, SecurityManager, type IInputValidationResult } from '../SecurityManager/SecurityManager';

const {
  MONGOOSE,
} = process.env;

export interface IWorkflow {
  nameSpace: string;
  name: string;
  version: string;
  component: any;
  category: string;
  autoStart?: boolean;
  props?: any;
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

class Logger implements ILogger {
  error(message?: any, ...optionalParams: any[]): void {
    logger.error(message, optionalParams);
  }
  info(message?: any, ...optionalParams: any[]): void {
    logger.info(message, optionalParams);
  }
  log(message?: any, ...optionalParams: any[]): void {
    logger.debug(message, optionalParams);
  } 
}

const getDefaultWorkflows = (): IWorkflow[] => {

  const availableworkflows: IWorkflow[] = [];
  reactoryModules.enabled.forEach((reactoryModule) => {
    if (isArray(reactoryModule.workflows)) {    
      reactoryModule.workflows.forEach((workflow: any) => {
        if (typeof workflow === 'object' && workflow.category === 'workflow') {
          logger.debug(`🔀 Loading workflow for module ${reactoryModule.name}`, workflow);        
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
  private connection: mongoose.Connection | null = null;
  private persistence: IPersistenceProvider | null = null;
  private state: IWorkflowState;
  private props: IWorkflowRunnerProps;
  private _isInitialized: boolean = false;
  private isStarting: boolean = false;
  private scheduler: WorkflowScheduler | null = null;
  private errorHandler: ErrorHandler;
  private lifecycleManager: WorkflowLifecycleManager;
  private configurationManager: ConfigurationManager;
  private securityManager: SecurityManager;  

  constructor(props: IWorkflowRunnerProps) {

    // ensure singleton pattern
    if (!instance) {
      instance = this;
    } else {
      // return the instance
      return instance;
    }

    this.props = props;
    this.state = {
      workflows: props.workflows || getDefaultWorkflows(),
      host: null,
    };
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

    instance = this;
    return instance;
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
      this.isStarting = true;
      const { host, autoStart } = await this.start();
      this.setState({ host });
      this._isInitialized = true;
      this.isStarting = false;

      // Set up AMQ event handlers
      await this.setupAmqEventHandlers();
      
      // Start auto-start workflows
      await this.startAutoStartWorkflows(autoStart);

      // Initialize scheduler
      this.scheduler = new WorkflowScheduler(this);
      await this.scheduler.initialize();
      

      // Initialize lifecycle manager
      await this.lifecycleManager.initialize();

      // Initialize configuration manager
      await this.configurationManager.initialize();

      // Initialize security manager
      await this.securityManager.initialize();

      logger.info('WorkflowRunner initialized successfully');
    } catch (error) {
      this.isStarting = false;
      logger.error('Failed to initialize WorkflowRunner', error);
      throw error;
    }
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
   * Validate workflow
   */
  private validateWorkflow(workflow: IWorkflow): boolean {
    try {
      return !!(workflow && 
        workflow.nameSpace && 
        workflow.name && 
        workflow.version && 
        workflow.component);
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

      logger.debug('Adding workflow to host', workflow);
      if (this.state.host) {
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
   * Get persistence provider
   */
  private async getPersistenceProvider(): Promise<IPersistenceProvider | null> {
    try {
      if (MONGOOSE) {
        logger.debug('Using Mongoose for Workflow Persistence');
        const mongoPersistence = new MongoDBPersistence(MONGOOSE);      
        //await mongoPersistence.connect();
        return mongoPersistence;
      }
      logger.debug('Using In Memory for Workflow Persistence');
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

      if (this.persistence) {
        if (MONGOOSE && this.persistence instanceof MongoDBPersistence) {
          await this.persistence.close();
        }
        this.persistence = null;      
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
      
      const host = config.getHost();
      const autoStart: IWorkflow[] = [];
      
      for (const workflow of workflows) {
        try {
          logger.debug(`Registering workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} in host`, { __type: typeof workflow });        
          host.registerWorkflow(workflow.component);
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
   * Start a specific workflow with enhanced error handling
   */
  public async startWorkflow(id: string, version: string, data: any): Promise<any> {
    const context: IErrorContext = {
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
        logger.warn(`Invalid version number ${version}, using default 1`, error);
      }
    }

    try {
      if (!this.state.host) {
        throw new Error('Workflow host not initialized');
      }

      return await this.errorHandler.executeWithRetry(
        async () => {
          const startResult = await this.state.host!.startWorkflow(id, versionNumber, data);
          logger.debug(`Workflow ${id}@${versionNumber} started successfully`, startResult);
          return startResult;
        },
        context
      );
    } catch (error) {
      logger.error(`Failed to start workflow ${id}@${version}`, error);
      throw error;
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
   * Get workflow statistics
   */
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
