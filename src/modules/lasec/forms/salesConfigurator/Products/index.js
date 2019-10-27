import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'LasecProductList',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales Configurator Product List',
  tags: ['CRM Salesconfigurator Products'],
  registerAsComponent: true,
  name: 'ProductList',
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
