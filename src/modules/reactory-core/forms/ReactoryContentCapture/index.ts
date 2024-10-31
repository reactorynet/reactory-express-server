
import schema from './schema';
import * as uiSchemas from './uiSchemas';
import $graphql from './graphql';
import Reactory from '@reactory/reactory-core';

const {
  fullEditor,
  inlineEditor,
  minimalEditor
} = uiSchemas;

const ContentCapture: Reactory.Forms.IReactoryForm = {
  id: 'ContentCapture',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Reactory Content Capture Page',
  tags: ['static content', 'blog', 'dynamic content'],
  name: 'ContentCapture',
  nameSpace: 'static',
  version: '1.0.0',
  description: 'Allows the user to create static content / dynamic content using the Reactory Content editor',  
  helpTopics: [
    'ContentCapture',
    'MountReactoryWidgetInContent'
  ],
  registerAsComponent: true,
  schema,
  uiSchema: fullEditor,  
  uiSchemas: [
    {
      id: 'inline',
      title: 'Inline',
      key: 'inline',
      description: 'Inline Editor View',
      icon: 'edit',
      uiSchema: inlineEditor,
    },
    {
      id: 'full',
      title: 'Full',
      key: 'full',
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
      uiSchema: minimalEditor,
    },    
  ],  
  graphql: $graphql
};

export default ContentCapture;
