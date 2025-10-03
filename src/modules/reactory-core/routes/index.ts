//custom route handler to be expressed here

import SupportRouter from './support/Support';
import WorkflowRouter from './workflow/Workflow';

export default {
  '/support': SupportRouter,
  '/workflow': WorkflowRouter
}