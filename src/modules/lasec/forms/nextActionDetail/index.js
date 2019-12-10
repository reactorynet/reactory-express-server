import $schema from './schema';
import $uiSchema from './uiSchema';

export default {
  id: 'LasecNextActionDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Next Action Detail',
  tags: ['Next Action Detail'],
  registerAsComponent: true,
  name: 'LasecNextActionDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  widgetMap: [
    {
      componentFqn: 'core.DateLabel@1.0.0',
      widget: 'DateWidget',
    },
    {
      componentFqn: 'core.ChipLabel@1.0.0',
      widget: 'ChipLabelWidget',
    },
  ],
};
