
import schema from './schema';
import DefaultUiSchema from './uiSchema';
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
  defaultFormValue: {
    slug: ''
  },
  graphql: $graphql
};

export default ContentCapture;
