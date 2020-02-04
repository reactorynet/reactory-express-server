

import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'QuoteDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quotes Detail',
  tags: ['CRM Dashboard'],
  schema: $schema,
  widgetMap: [
    {
      componentFqn: 'core.CurrencyLabel@1.0.0',
      widget: 'CurrencyWidget',
    },
  ],
  registerAsComponent: true,
  name: 'QuoteDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: $uiSchema,
  graphql: $graphql,
};
