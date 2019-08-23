import express from 'express';
import { configureWorkflow, ConsoleLogger } from 'workflow-es';
import { MongoDBPersistence } from 'workflow-es-mongodb';
import { isArray } from 'lodash';
import moment from 'moment';
import amq from '../amq';
import StartupWorkflow from './core/StartupWorkflow';
import reactoryModules from '../modules';

import logger from '../logging';


const router = express.Router();
const {
  APP_DATA_ROOT,
  MONGOOSE,
  API_PORT,
  API_URI_ROOT,
  CDN_ROOT,
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

class WorkFlowRunner {
  constructor(props) {
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
    this.start().then((host) => {
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
      setTimeout(() => {
        amq.raiseWorkFlowEvent('startWorkflow', {
          id: 'reactory.StartupWorkflow',
          version: 1,
          data: { when: moment().valueOf() },
          src: 'self',
        });
      }, 1500);
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

  async start() {
    const config = configureWorkflow();
    const { workflows } = this.state;
    config.useLogger(new ConsoleLogger());
    const mongoPersistence = new MongoDBPersistence(MONGOOSE);
    await mongoPersistence.connect;
    config.usePersistence(mongoPersistence);
    const host = config.getHost();
    try {
      workflows.forEach((workflow) => {
        logger.debug(`Registering workflow ${workflow.nameSpace}.${workflow.name}@${workflow.version} in host`, { __type: typeof workflow });
        host.registerWorkflow(workflow.component);
      });
      await host.start();
      return host;
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
