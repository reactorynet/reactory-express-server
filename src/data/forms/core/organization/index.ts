import { defaultFormProps } from '../../defs';
import OrganizationSchema from './Organization';
import { DefaultUiSchema, DetailedUiSchema } from './uiSchema';
import { Reactory } from 'types/reactory';

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

const OrganizationForm : Reactory.IReactoryForm = {
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
      variables: {
        'formData.id': 'id',
      },
      edit: true,
      new: false,
    },
    mutation: {
      new: {
        name: 'createOrganization',
        text: `mutation createOrganization($input: CreateOrganizationInput!){
          createOrganization(input: $input) {
            ${organizationFieldsSnippted}
          }
        }`,
        objectMap: true,
        variables: {
          'formData.name': 'input.name',
          'formData.code': 'input.code',
          'formData.logo': 'input.logo',
        },
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: "notification",
        notification: {
          inAppNotification: true,
          title: 'Organization created',
          props: {
            timeOut: 10000,
            canDismiss: true,
            typeKey: 'success',          
            components: [
              {
                componentFqn: 'core.ConditionalIconComponent@1.0.0',
                componentProps: {
                  conditions: [
                    {
                      key: 'false',
                      icon: 'trip_origin',
                      style: {
                        color: 'red'
                      },
                      tooltip: 'Confirm that your action has been saved to your task'
                    },
                    {
                      key: 'true',
                      icon: 'trip_origin',
                      style: {
                        color: '#fff'
                      },
                      tooltip: 'A task should be in your outlook calendar'
                    }
  
                  ]
                },
                style: {
                  marginRight: '8px',
                  marginTop: '8px',
                },
                propsMap: {
                  'formData.success': 'value',
                },
              }
            ]
          }      
        },
      },
      edit: {
        name: 'updateOrganization',
        text: `mutation UpdateOrganization($id: String!, $input: UpdateOrganizationInput!){
          updateOrganization(id: $id, input: $input) {
            ${organizationFieldsSnippted}
          }
        }`,
        objectMap: true,
        variables: {
          'formData.id': 'id',
          'formData.name': 'input.name',
          'formData.code': 'input.code',
          'formData.logo': 'input.logo',
          'formData.legacyId': 'input.legacyId',
        },
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'notification',
        notification: {
          inAppNotification: true,
          title: 'Organization created',
          props: {
            timeOut: 10000,
            canDismiss: true,
            typeKey: 'success',          
            components: [
              {
                componentFqn: 'core.ConditionalIconComponent@1.0.0',
                componentProps: {
                  conditions: [
                    {
                      key: 'false',
                      icon: 'trip_origin',
                      style: {
                        color: 'red'
                      },
                      tooltip: 'Confirm that your action has been saved to your task'
                    },
                    {
                      key: 'true',
                      icon: 'trip_origin',
                      style: {
                        color: '#fff'
                      },
                      tooltip: 'A task should be in your outlook calendar'
                    }
  
                  ]
                },
                style: {
                  marginRight: '8px',
                  marginTop: '8px',
                },
                propsMap: {
                  'formData.success': 'value',
                },
              }
            ]
          }      
        },
      },
    },
  },
  uiSchema: DefaultUiSchema,
  /*
  uiSchemas: [
    {
      id: 'default',
      title: 'Default View',
      key: 'default',
      description: 'Default Organization View',
      icon: 'view_quilt',
      uiSchema: DefaultUiSchema,
    },
    {
      id: 'detail',
      title: 'Detail View',
      key: 'detail',
      description: 'Detailed Organization View',
      icon: 'view_module',
      uiSchema: DetailedUiSchema,
    },
  ], */
};


export default OrganizationForm;