import { defaultFormProps } from '../../../defs';
import UserPeerSchema from './Schema';
import uiSchema from './uiSchemas';

export default {
  id: 'UserPeers',
  ...defaultFormProps,
  name: 'UserPeers',
  nameSpace: 'forms',
  version: '1.0.0',
  componentDefs: [],
  helpTopics: ['User Peers', 'Organigram'],
  registerAsComponent: true,
  schema: UserPeerSchema,
  uiSchema: uiSchema.DefaultUISchema,
  uiSchemas: [
    {
      id: 'default',
      title: 'Default View',
      value: 'default',
      description: 'Default Peers View',
      icon: 'view_list',
      uiSchema: uiSchema.DefaultUISchema,
    },
    {
      id: 'detail',
      title: 'Detailed View',
      value: 'detail',
      description: 'Detailed Peers View',
      icon: 'view_quilt',
      uiSchema: uiSchema.DetailUISchema,
    },
  ],
};
