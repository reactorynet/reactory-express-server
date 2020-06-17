import { Reactory } from "@reactory/server-core/types/reactory";
import { UIFrameWork } from "@reactory/server-core/types/constants";

const $uiSchema: any = {
  'ui:options': {    
    componentType: "div",    
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      welcomeMessage: { lg: 12, md: 12, sm: 12 },       
    },    
  ],  
};

const defaultFormValue = {
  welcomeMessage: "Welcome user"
};

export const MoresUserDashboard: Reactory.IReactoryForm = {
  id: 'UserDashboard',
  title: 'Mores Assessment User Dashboard',  
  nameSpace: 'mores',
  uiFramework: UIFrameWork.material,
  uiSupport: [ UIFrameWork.material ],
  name: 'UserDashboard',
  helpTopics: [''],
  version: '1.0.0',
  registerAsComponent: true,
  schema: {
    type: 'object',
    properties: {
      welcomeMessage: {
        type: 'string',
      }      
    }
  },
  uiSchema: $uiSchema,
  defaultFormValue,   
};
