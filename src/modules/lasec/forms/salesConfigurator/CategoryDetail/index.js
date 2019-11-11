import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'LasecCategoryDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales Configurator Category Detail',
  tags: ['CRM Salesconfigurator Category Detail'],
  registerAsComponent: true,
  name: 'LasecCategoryDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql
};
