import express from 'express';
import { configureWorkflow, ConsoleLogger } from 'workflow-es';
import { MongoDBPersistence } from 'workflow-es-mongodb';
import LoginWorkflow from './test/LoginWorkflow';
import logger from '../logging';

const router = express.Router();
const {
  APP_DATA_ROOT,
  MONGOOSE,
  API_PORT,
  API_URI_ROOT,
  CDN_ROOT,
} = process.env;

export const DefaultWorkflows = [
  {
    nameSpace: 'workflow',
    name: 'LoginForm',
    version: '1.0.0',
    component: LoginWorkflow,
  },
];


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
    this.initialize();
  }

  initialize() {
    this.start().then((host) => {
      this.setState({ host });

      setTimeout(() => { host.startWorkflow('LoginWorkflow', 1, { when: new Date() }); }, 1500);
    });
  }

  setState(state) {
    this.state = { ...this.state, ...state };
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
        //console.log('Registering workflow', { workflow });
        host.registerWorkflow(workflow.component);
      });
      await host.start();
      return host;
    } catch (workFlowError) {
      console.error('Error starting workflow', workFlowError);
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

router.post('/start', (req, res) => {
  return res.send({ result: 'started' });
});

export default router;
