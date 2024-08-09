import schema from './schema';
import uiSchema from './uiSchema';
import modules from './modules';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import _ from 'lodash';
interface IApplicationsFormData { 
  greeting: string, 
  applications: { id: string, title: string, avatar: string, url: string }[]
}

/**
 * Default data is return from the server and no graph call is required. This means the form details and the data associated 
 * with it is resolved when the form is loaded.
 * @param form - the form definition model
 * @param args - the arguments for the resolver
 * @param context - the context object
 * @param info - graph info
 * @returns 
 */
const getData = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<IApplicationsFormData> => {

  let $ids = context.user.memberships.map((m: Reactory.Models.IMembershipDocument) => {  
    return m.clientId
  });
  
  const $apps: Reactory.Models.IReactoryClientDocument[] = await ReactoryClient.find({ _id: { $in: $ids }}).exec();
  const { i18n, theme, palette } = context;  

  const data =  {    
    greeting: i18n.t("forms:reactory.applications.properties.greeting", { user: context.user }),
    applications: $apps.map((a) => {      
      let logo: any = { name: '', url: '', assetType: 'image' };
      const appTheme: Reactory.UX.IReactoryTheme = _.find(a.themes, { name: a.theme })
      if(appTheme) {
        logo = _.find(appTheme.assets, { name: 'logo' });
      }
      

      return { 
        id: a._id.toString(),
        avatar: a.avatar,
        title: i18n.t(a.name, a.name),
        url: a.siteUrl,
        logo: logo?.url || `//via.placeholder.com/160x90/${palette?.primary?.main.replace("#", "")}/${palette?.primary?.contrastText.replace("#", "")}`,
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
  roles: ['USER'],
  // widgetMap: [
  //   {
  //     componentFqn: "core.ContentWidget@1.0.0",
  //     widget: "ContentWidget"    
  //   },
  //   {
  //     componentFqn: "core.ApplicationCard@1.0.0",
  //     widget: "ApplicationCard"
  //   }
  //  ],
  helpTopics: [
    "reactory-my-applications", 
    "application-management"],
  defaultFormValue: getData,  
  schema,
  uiSchema,
  modules
}

export default Applications;