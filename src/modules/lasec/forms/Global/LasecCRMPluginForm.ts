import { Reactory } from '@reactory/server-core/types/reactory'
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const LasecCRMPluginForm: Reactory.IReactoryForm = {
  id: 'LasecCRMPluginForm',  
  uiFramework: 'material',
  uiSupport: ['material'],  
  uiResources: [
    {
      id: 'reactory.plugin.lasec360',
      name: 'reactory.plugin.lasec360',
      type: 'script',
      uri: `${ENVIRONMENT.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
  title: 'Lasec CRM Plugin Global Form',
  tags: ['Lasec Plugin'],
  schema: {
    type: 'object',
    properties: {
      plugin: {
        title: 'Plugin',
        type: 'string',    
      }
    }    
  },
  registerAsComponent: true,
  components: ['lasec-crm.Lasec360Plugin@1.0.0'],  
  name: '$GLOBAL$LasecCRMPluginForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  roles: ['USER'], 
  className: '', 
  uiSchema: {    
    'ui:options': {
      showSubmit: false,      
      style: {
        display: 'none',
        height: '0px',
      },
    },
    plugin: {
      'ui:widget': 'HiddenWidget'
    }
  },
  defaultFormValue: {
    plugin: 'plugins/lasec-crm/lib/reactory.plugin.lasec360.js'
  },
};

export default LasecCRMPluginForm;