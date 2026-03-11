//custom route handler to be expressed here

import SupportRouter from './support/Support';
import WorkflowRouter from './workflow/Workflow';
import UserAccountRouter from './useraccount/UserAccount';

export default {
  '/support': SupportRouter,
  '/workflow': WorkflowRouter,
  '/useraccount': UserAccountRouter,
}