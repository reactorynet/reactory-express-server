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
import amq from '../../amq';
import StartupWorkflow from '../core/StartupWorkflow';
import reactoryModules from '../../modules';
import logger from '../../logging';
import mongoose from 'mongoose';
import { WorkflowScheduler } from './Scheduler';

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

export const DefaultWorkflows: IWorkflow[] = [
  {
    nameSpace: 'reactory',
    name: 'Startup',
    version: '1.0.0',
    component: StartupWorkflow,
    category: 'workflow',
  },
  ...availableworkflows,
];

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

  constructor(props: IWorkflowRunnerProps) {
    this.props = props;
    this.state = {
      workflows: props.workflows || DefaultWorkflows,
      host: null,
    };
    this.initialize = this.initialize.bind(this);
    this.startWorkflow = this.startWorkflow.bind(this);
    this.registerWorkflow = this.registerWorkflow.bind(this);
    this.validateWorkflow = this.validateWorkflow.bind(this);
    this.onStateChanged = this.onStateChanged.bind(this);
    this.setState = this.setState.bind(this);
    this.stop = this.stop.bind(this);
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
          logger.debug(`Workflow ${id}@${version} has been started`, startResult);
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
    logger.debug('Workflow State Changed', { oldState, newState });
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
        await mongoPersistence.connect();
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
   * Start a specific workflow
   */
  public async startWorkflow(id: string, version: string, data: any): Promise<any> {
    try {
      if (!this.state.host) {
        throw new Error('Workflow host not initialized');
      }
      
      const startResult = await this.state.host.startWorkflow(id, version, data);
      logger.debug(`Workflow ${id}@${version} started successfully`, startResult);
      return startResult;
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
} 