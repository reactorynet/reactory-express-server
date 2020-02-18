import { Reactory } from "types/reactory";
import { FormNameSpace } from "modules/towerstone/constants";
import { UIFrameWork } from "types/constants";

import { behaviourSchema } from './LeadershipBrandAdmin/schema';


const $uiSchema: any = {
  'ui:options': {    
    componentType: "div",    
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      description: { md: 6, sm: 12 }, 
      ordinal: { md: 3, sm: 6 }
    },    
  ],  
};

const defaultFormValue = {
  title: ""
};

export const BehaviourFormWidget: Reactory.IReactoryForm = {
  id: 'BehaviourFormWidget',
  title: 'TowerStone Leadership Brand - Behaviour Widget',  
  nameSpace: FormNameSpace,
  uiFramework: UIFrameWork.material,
  uiSupport: [ UIFrameWork.material ],
  name: 'BehaviourFormWidget',
  helpTopics: ['Behaviour Form Widget'],
  version: '1.0.0',
  registerAsComponent: true,
  schema: behaviourSchema,
  uiSchema: $uiSchema,
  defaultFormValue,   
};
