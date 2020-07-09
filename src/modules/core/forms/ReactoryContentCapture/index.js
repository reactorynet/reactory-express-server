
import schema from './schema';
import DefaultUiSchema, { minimalEdit, minimalExtendedEdit } from './uiSchema';
import $graphql from './graphql.js';


const ContentCapture = {
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
  author: {
    fullName: 'Drew Murphy',
    email: 'drewmurphyza@gmail.com',
  },
  helpTopics: [
    'ContentCapture',
  ],
  registerAsComponent: true,
  schema,
  uiSchema: DefaultUiSchema,
  uiSchemas: [
    {
      id: 'default',
      title: 'Default',
      key: 'default',
      description: 'Default Content Edit View',
      icon: 'edit',
      uiSchema: DefaultUiSchema,
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
  defaultFormValue: {
    slug: ''
  },
  graphql: $graphql
};

export default ContentCapture;
