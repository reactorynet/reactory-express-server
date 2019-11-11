import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'LasecQuotesList',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quotes List',
  tags: ['CRM Quotes'],
  registerAsComponent: true,
  name: 'QuotesList',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql,
  // defaultFormData: [
  //   {
  //     primaryText: 'Loading',
  //     secondaryText: 'Some text'
  //   }
  // ],
};
