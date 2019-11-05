import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export default {
  id: 'LasecCategoryFilterList',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Category Filter List',
  tags: ['CRM Category Filter List'],
  registerAsComponent: true,
  name: 'LasecCategoryFilterList',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql,
  widgetMap: [
    {
      component: 'core.Label@1.0.0',
      widget: 'LabelWidget',
    },
  ],
};
