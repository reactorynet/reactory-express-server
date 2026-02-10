import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Application Users',
  properties: {
    clientId: {
      type: 'string',
      title: 'Client ID'
    },
    clientName: {
      type: 'string',
      title: 'Application Name'
    },
    clientKey: {
      type: 'string',
      title: 'Client Key'
    },
    totalUsers: {
      type: 'number',
      title: 'Total Users'
    },
    data: {
      type: 'array',
      title: 'Users',
      items: {
        type: 'object',
        title: 'User',
        properties: {
          id: {
            type: 'string',
            title: 'ID'
          },
          firstName: {
            type: 'string',
            title: 'First Name'
          },
          lastName: {
            type: 'string',
            title: 'Last Name'
          },
          email: {
            type: 'string',
            title: 'Email',
            format: 'email'
          },
          mobileNumber: {
            type: 'string',
            title: 'Mobile'
          },
          avatar: {
            type: 'string',
            title: 'Avatar'
          },
          memberships: {
            type: 'array',
            title: 'Memberships',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                roles: { 
                  type: 'array',
                  items: { type: 'string' }
                },
                enabled: { type: 'boolean' },
                lastLogin: { type: 'string', format: 'date-time' },
                created: { type: 'string', format: 'date-time' }
              }
            }
          },
          createdAt: {
            type: 'string',
            title: 'Created',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            title: 'Updated',
            format: 'date-time'
          },
          lastLogin: {
            type: 'string',
            title: 'Last Login',
            format: 'date-time'
          }
        }
      }
    }
  }
}

const ApplicationUsersSchemaResolver = async (
  form: Reactory.Forms.IReactoryForm,
  args: any,
  context: Reactory.Server.IReactoryContext,
  info: any
): Promise<Reactory.Schema.AnySchema> => {
  return schema;
}

export default ApplicationUsersSchemaResolver;
