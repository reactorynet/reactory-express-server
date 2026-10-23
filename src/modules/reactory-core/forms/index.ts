import Applications from './Applications';
import Application from './Application';
import ApplicationUsers from './Application/ApplicationUsers';
import ApplicationRouteEditor from './Application/ApplicationRouteEditor';
import StaticContentInputForm from './StaticContentInputForm';
import ReactoryContentCapture from './ReactoryContentCapture';
import ReactoryContentList from './ReactoryContentList';
import TemplateList from './EmailTemplate/TemplateList';
import EmailForms from './EmailForms';
import shared from './shared';
import { Login, RouteAccess } from './Security';
import SupportForm from './Support/SupportRequest';
import SupportTickets from './Support/SupportTickets';
import SupportTicketsAdmin from './Support/SupportTicketsAdmin';
import SupportTicketDetails from './Support/SupportTicketDetails';
import SupportticketDelete from './Support/SupportTicketDelete';
import WorkflowForms from './Workflow'
import UserForms from './User';
import ReactoryFormSubmissions from './FormSubmissions';

export default [
  Applications,
  Application,
  ApplicationUsers,
  ApplicationRouteEditor,
  StaticContentInputForm,
  ReactoryContentCapture,
  ReactoryContentList,
  TemplateList,
  Login,
  RouteAccess,
  ...EmailForms,
  ...shared,
  SupportForm,
  SupportTickets,  
  SupportTicketsAdmin,
  SupportTicketDetails,
  SupportticketDelete,
  ...WorkflowForms,
  ...UserForms,
  ReactoryFormSubmissions,
];
