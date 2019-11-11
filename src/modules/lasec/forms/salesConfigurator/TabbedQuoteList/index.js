import $schema from './schema';
import $uiSchema from './uiSchema';

export default {
  id: 'LasecTabbedQuotes',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quotes List',
  tags: ['CRM Quotes'],
  schema: $schema,
  registerAsComponent: true,
  name: 'TabbedQuotesList',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  widgetMap: [
    {
      componentFqn: 'core.TabbedNavigation@1.0.0',
      widget: 'TabbedNavWidget',
    },
  ],
  uiSchema: $uiSchema,
  defaultFormData: {
    tabbedQuotes: {
      tabs: [
        {
          title: 'Tab 1'
        },
        {
          title: 'Tab 2'
        },
        {
          title: 'Tab 3'
        }
      ]
    }
  },
};
