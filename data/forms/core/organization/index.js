import { defaultFormProps } from '../../defs';
import OrganizationSchema from './Organization';
import { DefaultUiSchema, DetailedUiSchema } from './uiSchema';

export const OrganizationLoginForm = {
  id: 'OrganizationLoginForm',
  ...defaultFormProps,
  name: 'OrganizationLoginForm',
  nameSpace: 'forms',
  version: '1.0.0',
  componentDefs: [],
  helpTopics: [''],
  registerAsComponent: true,
  schema: OrganizationSchema,
  uiSchema: DefaultUiSchema,
  graphql: {
    query: {
      name: 'userOgranizations',
      text: `query UserOrganizationMembers {
        userOrganizations {
          id
          name
          logo
        }
      }`,
    },
  },
};

export default {
  id: 'OrganizationForm',
  ...defaultFormProps,
  name: 'OrganizationForm',
  nameSpace: 'forms',
  version: '1.0.0',
  componentDefs: [],
  helpTopics: [''],
  registerAsComponent: true,
  schema: OrganizationSchema,
  uiSchema: DefaultUiSchema,
  uiSchemas: [
    {
      id: 'default',
      title: 'Default View',
      key: 'default',
      description: 'Default Task Detail View',
      icon: '',
      uiSchema: DefaultUiSchema,
    },
    {
      id: 'detail',
      title: 'Detail View',
      key: 'detail',
      description: 'Detailed Task Detail View',
      icon: '',
      uiSchema: DetailedUiSchema,
    },
  ],
};
