import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'LasecQuotes',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quotes List Dashboard',
  tags: ['CRM Dashboard'],
  schema: $schema,
  registerAsComponent: true,
  name: 'Quotes',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: $uiSchema,
  graphql: $graphql,
};
