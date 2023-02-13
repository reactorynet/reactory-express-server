
import schema from './schema';
import DefaultUiSchema, { minimalEdit, minimalExtendedEdit, fullEditor } from './uiSchema';
import $graphql from './graphql';
import Reactory from '@reactory/reactory-core';

const ContentCapture: Reactory.Forms.IReactoryForm = {
  id: 'ContentCapture',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Reactory Content Capture Page',
  tags: ['Content Capture', 'forms'],
  name: 'ContentCapture',
  nameSpace: 'static',
  version: '1.0.0',
  description: 'A form that represent a Content Capture page',  
  helpTopics: [
    'ContentCapture',
  ],
  registerAsComponent: true,
  schema,
  uiSchema: DefaultUiSchema,
  uiSchemas: [
    {
      id: 'inline',
      title: 'Inline',
      key: 'inline',
      description: 'Inline Editor View',
      icon: 'edit',
      uiSchema: DefaultUiSchema,
    },
    {
      id: 'default',
      title: 'Full',
      key: 'default',
      description: 'Full Editor',
      icon: 'edit',
      uiSchema: fullEditor,
    },    
    {
      id: 'minimal',
      title: 'Minmal',
      key: 'minimal',
      description: 'Minimal Content Edit View',
      icon: 'edit',
      uiSchema: minimalEdit,
    },
    {
      id: 'minimalExtended',
      title: 'Minmal Extended',
      key: 'minimalExtended',
      description: 'Minimal Content Edit View',
      icon: 'edit',
      uiSchema: minimalExtendedEdit,
    },
  ],  
  graphql: $graphql
};

export default ContentCapture;
