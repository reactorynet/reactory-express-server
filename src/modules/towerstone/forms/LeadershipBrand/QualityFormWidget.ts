import { Reactory } from "types/reactory";
import { FormNameSpace } from "../../constants";
import { UIFrameWork } from "types/constants";

import { qualitySchema } from './LeadershipBrandAdmin/schema';


const $uiSchema: any = {
  'ui:options': {    
    componentType: "div",    
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      title: { md: 6, sm: 12 },
      description: { md: 6, sm: 12 }, 
      ordinal: { md: 3, sm: 6 }
    },
    {
      behaviours: { 
        md: 12
      }
    }
  ],
  behaviours: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'id',      
      primaryText: '${item.title || "Click to edit behaviour"}',      
      variant: 'button',
      allowAdd: true,
      title: "Leadership Brand Qualities",
      secondaryAction: {
        iconKey: 'edit',
        label: 'Edit',
        componentFqn: 'core.SlideOutLauncher@1.0.0',
        action: 'mount:Component',
        props: {
          componentFqn: 'towerstone.BehaviourFormWidget@1.0.0',            
          componentProps: {
            'formData': 'formData',                            
            'onChange':'onSubmit',
          },
          buttonIcon: 'edit',
          slideDirection: 'down',            
          windowTitle: 'Edit behavior',
          buttonVariant: 'IconButton',
        },        
      }
    },
  }
};

const defaultFormValue = {
  title: ""
};

export const QualityFormWidget: Reactory.IReactoryForm = {
  id: 'QualityFormWidget',
  title: 'TowerStone Leadership Brand Configuration',  
  nameSpace: FormNameSpace,
  uiFramework: UIFrameWork.material,
  uiSupport: [ UIFrameWork.material ],
  name: 'QualityFormWidget',
  helpTopics: ['Quality Form Widget'],
  version: '1.0.0',
  registerAsComponent: true,
  schema: qualitySchema,
  uiSchema: $uiSchema,
  defaultFormValue,   
};
