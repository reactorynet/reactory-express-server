import $schema from './schema';
import $uiSchema from './uiSchema';
// import $graphql from './graphql';

export default {
  id: 'CaptureCategory',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales Configurator Capture Category',
  tags: ['CRM Salesconfigurator Capture Category'],
  registerAsComponent: true,
  name: 'CaptureCategory',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  widgetMap: [
    {
      componentFqn: 'lasec-crm.LasecCategoryDetail@1.0.0',
      widget: 'LasecCategoryDetail',
    },
  ],
  components: ['lasec-crm.LasecCategoryDetail@1.0.0'],
  registerAsComponent: true,
  // widgetMap: [
  //   {
  //     component: 'lasec-crm.LasecCategoryDetail@1.0.0',
  //     widget: 'LasecCategoryDetail',
  //   },
  // ],
  // components: ['core.InboxComponent@1.0.0'],
  // registerAsComponent: true,
  // graphql: $graphql
};
