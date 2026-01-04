import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Support Tickets',
  properties: {
    message: {
      type: 'string'
    },
    tickets: {
      type: 'array',
      title: 'Tickets',
      items: {
        type: 'object',
        title: 'Ticket #${formData.reference}',
        properties: {
          id: {
            type: 'string',
            title: 'ID'
          },
          request: {
            type: 'string',
            title: 'Request'
          },
          status: {
            type: 'string',
            title: 'Status',
          },
          priority: {
            type: 'string',
            title: 'Priority',
            enum: ['low', 'medium', 'high', 'critical']
          },
          reference: {
            type: 'string',
            title: 'Reference No',
          },
          createdBy: {
            type: 'object',
            title: 'Logged By',
            properties: {
              id: { type: 'string', title: 'ID' },
              firstName: { type: 'string', title: 'Firstname' },
              lastName: { type: 'string', title: 'Lastname' },
              email: { type: 'string', title: 'Email' },
              avatar: { type: 'string', title: 'Avatar' }
            }
          },
          createdDate: {
            type: 'string',
            title: 'Date Logged'
          },
          updatedDate: {
            type: 'string',
            title: 'Last Updated'
          },
          assignedTo: {
            type: 'object',
            title: 'Assigned To',
            properties: {
              id: { type: 'string', title: 'ID' },
              firstName: { type: 'string', title: 'Firstname' },
              lastName: { type: 'string', title: 'Lastname' },
              email: { type: 'string', title: 'Email' },
              avatar: { type: 'string', title: 'Avatar' }
            }
          },
          comments: {
            type: 'array',
            title: 'Comments',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              }
            }
          },
          documents: {
            type: 'array',
            title: 'Documents',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              }
            }
          },
          tags: {
            type: 'array',
            title: 'Tags',
            items: {
              type: 'string'
            }
          }
        }
      }
    }
  }
}

const SupportSchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {

  const { i18n, user } = context;
  
  return schema;
}



export default SupportSchemaResolver;