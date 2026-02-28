import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    clientId: {
      type: 'string',
      title: 'Client ID'
    },
    totalOrganizations: {
      type: 'number',
      title: 'Total Organizations'
    },
    data: {
      type: 'array',
      title: 'Organizations',
      items: {
        type: 'object',
        title: 'Organization',
        properties: {
          id: {
            type: 'string',
            title: 'ID'
          },
          name: {
            type: 'string',
            title: 'Organization Name'
          },
          code: {
            type: 'string',
            title: 'Code'
          },
          tradingName: {
            type: 'string',
            title: 'Trading Name'
          },
          logo: {
            type: 'string',
            title: 'Logo'
          },
          logoURL: {
            type: 'string',
            title: 'Logo URL'
          },
          avatar: {
            type: 'string',
            title: 'Avatar'
          },
          avatarURL: {
            type: 'string',
            title: 'Avatar URL'
          },
          businessUnits: {
            type: 'array',
            title: 'Business Units',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      email: { type: 'string' }
                    }
                  }
                }
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
          }
        }
      }
    }
  }
}

const ApplicationOrganizationsSchemaResolver = async (
  form: Reactory.Forms.IReactoryForm,
  args: any,
  context: Reactory.Server.IReactoryContext,
  info: any
): Promise<Reactory.Schema.AnySchema> => {
  return schema;
}

export default ApplicationOrganizationsSchemaResolver;
