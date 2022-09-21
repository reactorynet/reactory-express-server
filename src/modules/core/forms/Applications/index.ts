import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import { ReactoryClient } from '@reactory/server-core/models';
import e from 'connect-flash';

interface IApplicationsFormData {  
  applications: { id: string, title: string, avatar: string, url: string }[]
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

  let $ids = context.user.memberships.map((m: Reactory.Models.IMembershipDocument) => {  
    return m.clientId
  });
  
  const $apps: Reactory.Models.IReactoryClientDocument[] = await ReactoryClient.find({ _id: { $in: $ids }}).exec();
  const { i18n } = context;
  const data =  {    
    applications: $apps.map((a) => {
      return { 
        id: a._id.toString(),
        avatar: a.avatar,
        title: a.name,
        url: a.siteUrl
      }
    })
  };

  return data;
};

const Applications: Reactory.Forms.IReactoryForm = {
  id: `reactory-my-applications`,
  nameSpace: 'reactory',
  name: 'MyApplications',
  uiFramework: "material",
  uiSupport: ["material"],
  title: "${props.context.i18n.t('forms:applicationTitle')}",
  registerAsComponent: true,
  version: "1.0.0",
  helpTopics: [
    "reactory-my-applications", 
    "application-management"],
  defaultFormValue: getData,  
  schema,
  uiSchema,
}

export default Applications;