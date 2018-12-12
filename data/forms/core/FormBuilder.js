const FormBuilderSchema = require('./FormBuilderSchema.json');

export const FormBuilder = {
  id: 'FormBuilder',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Form Builder',
  tags: ['Builder', 'Form Builder'],
  schema: FormBuilderSchema,
  registerAsComponent: true,
  name: 'FormBuilder',
  nameSpace: 'forms',
  version: '1.0.0',
  uiSchema: {

  },
};

export default {
  FormBuilder,
};
