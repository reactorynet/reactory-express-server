import Application from './Application';
import ApplicationUsers from './Application/ApplicationUsers';
import ApplicationOrganizations from './Application/ApplicationOrganizations';
import ApplicationRouteEditor from './Application/ApplicationRouteEditor';
import Applications from './Applications';
import ReactoryContentCapture from './ReactoryContentCapture';
import ReactoryContentList from './ReactoryContentList';
import TemplateList from './EmailTemplate/TemplateList';
import EmailForms from './EmailForms';
import shared from './shared';
import { Login } from './Security';
import SupportForm from './Support/SupportRequest';
import SupportTickets from './Support/SupportTickets';
import SupportticketDelete from './Support/SupportTicketDelete';
import WorkflowForms from './Workflow'
import UserForms from './User';

export default [
  Application,
  ApplicationUsers,
  ApplicationOrganizations,
  ApplicationRouteEditor,
  Applications,
  ReactoryContentCapture,
  ReactoryContentList,
  TemplateList,
  Login,
  ...EmailForms,
  ...shared,
  SupportForm,
  SupportTickets,  
  SupportticketDelete,
  ...WorkflowForms,
  ...UserForms
];
