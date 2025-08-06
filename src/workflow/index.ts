import express from 'express';
import { WorkflowRunner, DefaultWorkflows } from './WorkflowRunner';
import logger from '../logging';


const router = express.Router();
// Create a singleton instance of the WorkflowRunner
export const workflowRunner = new WorkflowRunner({ workflows: DefaultWorkflows });

// Initialize the workflow runner
workflowRunner.initialize().catch((error) => {
  logger.error('Failed to initialize WorkflowRunner', error);
});

router.get('/status', (req, res) => {
  return res.send({ all: 'good' });
});

router.post('/start/:workflowId', (req, res) => {
  const version = typeof req.query.version === 'string' ? req.query.version : '1';
  workflowRunner.startWorkflow(req.params.workflowId, version, { ...req.query, ...req.body });
  return res.send({ result: 'started' });
});

export default router;
