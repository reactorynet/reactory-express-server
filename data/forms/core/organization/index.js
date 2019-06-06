import { defaultFormProps } from '../../defs';
import OrganizationSchema from './Organization';
import { DefaultUiSchema, DetailedUiSchema } from './uiSchema';

const organizationFieldsSnippted = `
id
code
name
logo
avatar
createdAt
updatedAt
`;


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
      name: 'userOrganizations',
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
  graphql: {
    query: {
      name: 'OrganizationWithId',
      text: `
      query OrganizationWithId($id: String!){
        organizationWithId(id: $id){
          ${organizationFieldsSnippted}
        }    
      }
      `,
      edit: true,
      new: false,
    },
    mutation: {
      edit: {
        name: 'updateOrganization',
        text: `mutation UpdateOrganization($id: String!, $input: UpdateOrganizationInput){
          updateOrganization(id: $id, input: $input) {
            ${organizationFieldsSnippted}
          }
        }`,
        objectMap: true,
        variables: {
          'formContext.id': 'id',
          formData: 'input',
        },
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'refresh',
      },
    },
  },
  uiSchema: DefaultUiSchema,
  uiSchemas: [
    {
      id: 'default',
      title: 'Default View',
      key: 'default',
      description: 'Default Organization View',
      icon: 'search',
      uiSchema: DefaultUiSchema,
    },
    {
      id: 'detail',
      title: 'Detail View',
      key: 'detail',
      description: 'Detailed Organization View',
      icon: 'gear',
      uiSchema: DetailedUiSchema,
    },
  ],
};
