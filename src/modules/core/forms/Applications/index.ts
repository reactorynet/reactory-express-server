import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

interface IApplicationsFormData {
  message: string,
  applications: Reactory.Models.IReactoryClient[]
}

/**
 * 
 * @param form 
 * @param args 
 * @param context 
 * @param info 
 * @returns 
 */
const getData = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<IApplicationsFormData> => {
  return {
    message: `Welcome to your application dashboard ${context.user.firstName}.`,
    applications: []
  };
};

const Applications: Reactory.Forms.IReactoryForm = {
  id: `reactory/my-applications`,
  nameSpace: 'reactory',
  name: 'MyApplications',
  uiFramework: "material",
  uiSupport: ["material"],
  title: "${context.i18n('reactory.applications.title')}",
  registerAsComponent: true,
  version: "1.0.0",
  helpTopics: [
    "reactory/my-applications", 
    "application/management"],
  defaultFormValue: getData,  
  schema,
  uiSchema: {},
}

export default Applications;