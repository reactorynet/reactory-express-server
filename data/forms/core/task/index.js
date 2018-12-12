import { defaultFormProps } from '../../defs';
import TaskSchema from './Task';
import { DefaultUiSchema, DetailedUiSchema } from './uiSchema';

export default {
  id: 'TaskDetail',
  ...defaultFormProps,
  name: 'TaskDetailForm',
  nameSpace: 'forms',
  version: '1.0.0',
  componentDefs: [],
  helpTopics: [''],
  registerAsComponent: true,
  schema: TaskSchema,
  uiSchema: DefaultUiSchema,
  uiSchemas: [
    {
      id: 'default',
      title: 'Default View',
      value: 'default',
      description: 'Default Task Detail View',
      icon: 'view_list',
      uiSchema: DefaultUiSchema,
    },
    {
      id: 'detail',
      title: 'Detail View',
      value: 'detail',
      description: 'Detailed Task Detail View',
      icon: 'view_quilt',
      uiSchema: DetailedUiSchema,
    },
  ],
};
