import schema from './schema';
import * as uiSchemas from './uiSchemas';
import $graphql from './graphql';
import Reactory from '@reactorynet/reactory-core';

const {
  fullEditor,
  inlineEditor,
  minimalEditor,
  cmsEditor,
  splitPreviewEditor,
} = uiSchemas;

const ContentCapture: Reactory.Forms.IReactoryForm = {
  id: 'ContentCapture',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Reactory Content Capture Page',
  tags: ['static content', 'blog', 'dynamic content', 'cms'],
  name: 'ContentCapture',
  nameSpace: 'static',
  version: '1.0.0',
  description: 'Allows users to create and edit static/dynamic content using Reactory Content editor with full CMS features',  
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
      description: 'Full Editor View',
      icon: 'edit',
      uiSchema: fullEditor,
    },    
    {
      id: 'cms',
      title: 'CMS Experience',
      key: 'cms',
      description: 'Tabbed Full CMS Editor',
      icon: 'wysiwyg',
      uiSchema: cmsEditor,
    },
    {
      id: 'split',
      title: 'Split Preview',
      key: 'splitPreview',
      description: 'Side-by-side Editor and Live Preview',
      icon: 'vertical_split',
      uiSchema: splitPreviewEditor,
    },
    {
      id: 'minimal',
      title: 'Minimal',
      key: 'minimal',
      description: 'Minimal Content Edit View',
      icon: 'edit',
      uiSchema: minimalEditor,
    },    
  ],  
  graphql: $graphql
};

export default ContentCapture;
