
import $graphql from './graphql';
import $schema from './schema';
import $uiSchema from './uiSchema';

const TemplateList : Reactory.IReactoryForm = {
  id: 'TemplateList',  
  name: 'TemplateList',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: true,
  uiFramework: 'material',
  uiSupport: ['material'],
  helpTopics: ['template-list'],
  title: 'Template List',
  tags: ['Template Editor', 'Forms'],
  schema: $schema,
  uiSchema: $uiSchema,  
  graphql: $graphql
};

export default TemplateList;