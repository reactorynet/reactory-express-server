import Application from './Application';
import Applications from './Applications';
import ReactoryContentCapture from './ReactoryContentCapture';
import ReactoryContentList from './ReactoryContentList';
import ReactoryFormEditor from './ReactoryFormEditor';
import TemplateList from './EmailTemplate/TemplateList';
import ReactoryGlobalPlugin from './Global/ReactoryGlobalForm';
import EmailForms from './EmailForms';
import shared from './shared';
import { Login } from './Security';
import SupportForm from './Support/SupportRequest';
import SupportTickets from './Support/SupportTickets';
import SupportTicket from './Support/SupportTicket';
export default [
  Application,
  Applications,
  ReactoryContentCapture,
  ReactoryContentList,
  ReactoryFormEditor,
  TemplateList,
  Login,
  ...EmailForms,
  ...shared,
  SupportForm,
  SupportTickets,
  SupportTicket,
];
