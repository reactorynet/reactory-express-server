import $schema from './schema';
import $uiSchema from './uiSchema';
// import $graphql from './graphql';

export default {
  id: 'NewQuote',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales Configurator New Quote',
  tags: ['CRM Salesconfigurator New Quote'],
  registerAsComponent: true,
  name: 'NewQuote',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
};
