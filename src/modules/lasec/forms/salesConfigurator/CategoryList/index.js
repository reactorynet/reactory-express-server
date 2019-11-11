import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'LasecCategoryList',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales Configurator Category List',
  tags: ['CRM Salesconfigurator Categories'],
  registerAsComponent: true,
  name: 'CategoryList',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql,
  // defaultFormData: [
  //   {
  //     primaryText: 'Product One',
  //     secondaryText: ''
  //   }, {
  //     primaryText: 'Product Two',
  //     secondaryText: ''
  //   }, {
  //     primaryText: 'Product Three',
  //     secondaryText: ''
  //   }
  // ],
};
