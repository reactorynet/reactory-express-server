import express from 'express';
import { 
  configureWorkflow, 
  ConsoleLogger, 
  IPersistenceProvider,
  ILogger, 
} from 'workflow-es';
import { MongoDBPersistence } from 'workflow-es-mongodb';
import { isArray } from 'lodash';
import moment from 'moment';
import amq from '../amq';
import StartupWorkflow from './core/StartupWorkflow';
import reactoryModules from '../modules';

import logger from '../logging';
import mongoose from 'mongoose';


const router = express.Router();
const {
  APP_DATA_ROOT,
  MONGOOSE,
  API_PORT,
  API_URI_ROOT,
  CDN_ROOT,
  WORKFLOW_MONGO_DB,
} = process.env;

const availableworkflows = [];
reactoryModules.enabled.forEach((reactoryModule) => {
  // logger.debug(`Checking module ${reactoryModule.name} for workflows`);
  if (isArray(reactoryModule.workflows)) {
    logger.debug(`Loading workflows for module ${reactoryModule.name}`);
    reactoryModule.workflows.forEach((workflow) => {
      logger.debug(`Loading workflow for module ${reactoryModule.name}`, workflow);
      if (typeof workflow.meta === 'object' && workflow.meta.category === 'workflow') {
        logger.debug(`Adding Workflow ${workflow.meta.nameSpace}.${workflow.meta.name}@${workflow.meta.version}`);
        availableworkflows.push(workflow.meta);
      } else {
        logger.warn(`Did not load workflow item - bad shape, expecting object with category "workflow" found ${typeof workflow.meta}`, workflow.meta);
      }
    });
  }
});

export const DefaultWorkflows = [
  {
    nameSpace: 'reactory',
    name: 'Startup',
    version: '1.0.0',
    component: StartupWorkflow,
    category: 'workflow',
  },
  ...availableworkflows,
];

const safeCallback = (cb, params) => {
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
export class WorkFlowRunner {

  connection: mongoose.Connection;
  persistence: IPersistenceProvider;
  state: {
    workflows: any[],
    host: any,
  };
  props: any;
  constructor(props: any) {
    this.props = props;
    this.start = this.start.bind(this);
    this.setState = this.setState.bind(this);
    this.state = {
      workflows: props.workflows || DefaultWorkflows,
      host: null,
    };
    this.initialize = this.initialize.bind(this);
    this.startWorkflow = this.startWorkflow.bind(this);
    this.registerWorkflow = this.registerWorkflow.bind(this);
    this.validateWorkflow = this.validateWorkflow.bind(this);
    this.onStateChanged = this.onStateChanged.bind(this);
    this.initialize();
  }

  initialize() {
    this.start().then(({ host, autoStart }) => {
      this.setState({ host });
      amq.onWorkflowEvent('startWorkflow', (payload) => {
        logger.debug('Reactory workflow starting via amq');
        const {
          id, version, data, src,
        } = payload;
        this.startWorkflow(id, version, data).then((startResult) => {
          logger.debug(`Workflow ${id}@${version} has been started`, startResult);
          amq.raiseWorkFlowEvent(`reactory.workflow.started:${src}`, startResult);
        });
      });
      // amq.onWorkflowEvent('reactory.workflow.status', ())
      autoStart.forEach((autoStartWorkFlow) => {
        logger.debug(`Auto Starting Workflow ${autoStartWorkFlow.id}`, { autoStartWorkFlow });
        if(autoStartWorkFlow.props && autoStartWorkFlow.props.interval) {
          setInterval(()=>{
            amq.raiseWorkFlowEvent('startWorkflow', {
              id: autoStartWorkFlow.id,
              version: 1,
              data: {
                when: moment().valueOf(),
                props: autoStartWorkFlow.props || {},
              },
              src: 'self'
            });
          }, autoStartWorkFlow.props.interval);
        } else {
          amq.raiseWorkFlowEvent('startWorkflow', {
            id: autoStartWorkFlow.id,
            version: 1,
            data: {
              when: moment().valueOf(),
              props: autoStartWorkFlow.props || {},
            },
            src: 'self'
          });
        }        
      });      
    });
  }


  onStateChanged(oldState, newState) {
    logger.debug('Workflow State Changed');
  }

  setState(state, cb = () => {}) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...state };
    this.onStateChanged(oldState, this.state);
    safeCallback(cb);
  }


  validateWorkflow(workflow) {
    return true;
  }

  registerWorkflow(workflow) {
    logger.debug('Adding workflow to host');
    this.state.host.registerWorkflow(workflow);
    this.setState({ workflows: [...this.state.workflow, workflow] });
  }

  async getPersistenceProvider(): Promise<MongoDBPersistence> {
    if (MONGOOSE) {
      logger.debug('Using Mongoose for Workflow Persistence');
      const mongopersistence = new MongoDBPersistence(MONGOOSE);
      await mongopersistence.connect;
      return mongopersistence
    }
    logger.debug('Using In Memory for Workflow Persistence');
    return null;
  }

  async stop() { 
    if(this.persistence) {
      if(MONGOOSE) {
        await (this.persistence as MongoDBPersistence).client.close();
      }
      this.persistence = null;      
    }
  }

  async start() {
    const config = configureWorkflow();
    const { workflows } = this.state;
    config.useLogger(new Logger());
    this.persistence = await this.getPersistenceProvider();
    
    config.usePersistence(this.persistence);
    const host = config.getHost();
    try {
      const autoStart = [];
      workflows.forEach((workflow) => {
        logger.debug(`Registering workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} in host`, { __type: typeof workflow });        
        host.registerWorkflow(workflow.component);
        if(workflow.autoStart === true) {
          autoStart.push(workflow);
        }
      });
      await host.start();
      return { host, autoStart };
    } catch (workFlowError) {
      logger.error('Error starting workflow', workFlowError);
      return null;
    }
  }

  async startWorkflow(id, version, data) {
    const { host } = this.state;
    const startResult = await host.startWorkflow(id, version, data);
    return startResult;
  }
}

export const workflowRunner = new WorkFlowRunner({ workflows: DefaultWorkflows });

router.get('/status', (req, res) => {
  return res.send({ all: 'good' });
});

router.post('/start/:workflowId', (req, res) => {
  workflowRunner.startWorkflow(req.params.workflowId, req.query.version || '1', { ...req.query, ...req.body });
  return res.send({ result: 'started' });
});

export default router;
