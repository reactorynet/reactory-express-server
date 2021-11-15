import ReactoryFormList from './ReactoryFormList';
import AboutUsPage from './AboutUs';
import ReactoryContentCapture from './ReactoryContentCapture';
import ReactoryContentList from './ReactoryContentList';
import ReactoryFormEditor from './ReactoryFormEditor';
import TemplateList from './EmailTemplate/TemplateList';
import ReactoryGlobalPlugin from './Global/ReactoryGlobalForm';
import EmailForms from './EmailForms';
import shared from './shared';
import { Login } from './Security';
import SupportForm from './SupportRequest';
import SupportTickets from './SupportTickets';
export default [
  ReactoryGlobalPlugin,
  AboutUsPage,
  ReactoryFormList,
  ReactoryContentCapture,
  ReactoryContentList,
  ReactoryFormEditor,
  TemplateList,
  Login,
  ...EmailForms,
  ...shared,
  SupportForm,
  SupportTickets
];
