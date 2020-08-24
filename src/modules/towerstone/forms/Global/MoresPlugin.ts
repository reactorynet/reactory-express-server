import { Reactory } from '@reactory/server-core/types/reactory'
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const MoresPluginForm: Reactory.IReactoryForm = {
  id: 'MoresPluginForm',  
  uiFramework: 'material',
  uiSupport: ['material'],  
  uiResources: [
    {
      id: 'd3.core.v5',
      name: 'd3.core.v5',
      type: 'script',
      uri: 'https://d3js.org/d3.v5.min.js',
    },
    {
      id: 'reactory.plugin.mores',
      name: 'reactory.plugin.mores',
      type: 'script',
      uri: `${ENVIRONMENT.CDN_ROOT}plugins/mores/lib/reactory.plugin.mores.js`,
    },
  ],
  title: 'Mores Plugin Global Form',
  tags: ['Mores Plugin'],
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
  components: ['more.MoresAssessmentsUXPlugin@1.0.0'],  
  name: '$GLOBAL$MoresPluginForm',
  nameSpace: 'mores',
  version: '1.0.0',
  roles: ['USER', 'ANON'], 
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
    plugin: 'plugins/mores/lib/reactory.plugin.mores.js'
  },
};

export default MoresPluginForm;