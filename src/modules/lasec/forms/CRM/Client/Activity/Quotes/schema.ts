import { Reactory } from '@reactory/server-core/types/reactory';
const schema: Reactory.ISchema = {
  type: 'object',
  required: ['filterBy'],
  properties: {
    paging: {
      type: 'object',
      title: 'Paging',
      properties: {
        total: {
          type: 'number'
        },
        page: {
          type: 'number'
        },
        pageSize: {
          type: 'number'
        },
        hasNext: {
          type: 'boolean'
        }
      }
    },
    search: {
      type: 'string',
      title: 'Search'
    },
    filterBy: {
      type: 'string',
      title: 'FILTER BY'
    },
    quotes: {
      type: 'array',
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            title: "Client Id"
          },
          code: {
            type: "string",
            title: "Quote Number"
          },
          date: {
            type: "string",
            title: "Quote Date"
          },
        }
      },
    }
  }
};

export default schema;
