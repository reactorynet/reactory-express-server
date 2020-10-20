import ReactoryFormList from './ReactoryFormList';
import AboutUsPage from './AboutUs';
import ReactoryContentCapture from './ReactoryContentCapture';
import ReactoryContentList from './ReactoryContentList';
import ReactoryFormEditor from './ReactoryFormEditor';
import TemplateList from './EmailTemplate/TemplateList';
import ReactoryGlobalPlugin from './Global/ReactoryGlobalForm';
import EmailForms from './EmailForms';
export default [
  ReactoryGlobalPlugin,
  AboutUsPage,
  ReactoryFormList,
  ReactoryContentCapture,
  ReactoryContentList,
  ReactoryFormEditor,
  TemplateList,
  ...EmailForms
];
