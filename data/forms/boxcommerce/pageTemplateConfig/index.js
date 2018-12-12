export const PageTemplateConfigForm = {
  id: 'PageTemplateConfig',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Page Template Configuration',
  registerAsComponent: true,
  nameSpace: 'forms',
  name: 'PageTemplateConfig',
  version: '1.0.0',
  preview: null,
  tags: [],
  schema: {
    title: 'Template settings',
    description: 'Configure the template',
    type: 'object',
    properties: {
      templateType: {
        type: 'string',
        title: 'UI Framework',
        enum: ['bootstrap', 'material', 'custom'],
        enumTitles: ['Bootstrap 3', 'Material UI', 'Custom'],
      },
      hasNavigation: {
        type: 'boolean',
        title: 'Has Navigation Element',
      },
      navigationSelector: {
        type: 'string',
        title: 'Navigation Selector',
      },
      navigationComponent: {
        type: 'string',
        title: 'Navigation Component',
      },
    },
  },
  uiSchema: {

  },
};

export default PageTemplateConfigForm;
