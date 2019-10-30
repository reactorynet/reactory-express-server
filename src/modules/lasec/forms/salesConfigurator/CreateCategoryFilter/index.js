import $schema from './schema';
import $graphql from './graphql';

export default {
  id: 'LasecCreateCategoryFilter',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Category Filter',
  tags: ['CRM Category Filter'],
  registerAsComponent: true,
  name: 'CreateCategoryFilter',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: {},
  graphql: $graphql
};
