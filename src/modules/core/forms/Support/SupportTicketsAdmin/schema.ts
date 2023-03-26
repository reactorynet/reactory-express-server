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
          reference: {
            type: 'string',
            title: 'Reference No',
          },
          createdBy: {
            type: 'object',
            title: 'Logged By',
            properties: {
              id: { type: 'string', title: 'ID' },
              firstName: { type: 'string', title: 'Firstname'},
              lastName: { type: 'string', title: 'Lastname'},
              email: { type: 'string', title: 'Email'},
              avatar: { type: 'string', title: 'Avatar'}
            }
          },
          createdDate: {
            type: 'string',
            title: 'Date Logged'
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
        }
      }
    }
  }
}

export default schema;