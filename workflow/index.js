import express from 'express';
import { configureWorkflow } from 'workflow-es';
import { MongoDBPersistence } from 'workflow-es-mongodb';
import LoginWorkflow from './test/LoginWorkflow';
import logger from '../logging';

const router = express.Router();
const {
  WORKFLOW_MONGO,
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
    this.start().then(host => this.setState({ host }));
  }

  setState(state) {
    this.state = { ...this.state, ...state };
  }

  async start() {
    const config = configureWorkflow();
    const { workflows } = this.state;
    config.useLogger(logger);
    const mongoPersistence = new MongoDBPersistence(WORKFLOW_MONGO || 'mongodb://127.0.0.1:27017/reactory-workflow');
    await mongoPersistence.connect;
    // config.usePersistence(mongoPersistence);
    const host = config.getHost();

    workflows.map(workflow => host.registerWorkflow(workflow));
    await host.start();
    const id = await host.startWorkflow('LoginWorkflow', 1);
    console.log('Started workflow: ' + id);
    return host;
  }

  async startWorkflow(id, version, data) {
    const { host } = this.state;
    const startResult = await host.startWorkflow(id, version, data);
    return startResult;
  }
}

const workflowRunner = new WorkFlowRunner({ workflows: DefaultWorkflows });

router.get('/status', (req, res) => {
  return res.send(workflowRunner);
});

router.post('/start', (req, res) => {
  return res.send();
});
