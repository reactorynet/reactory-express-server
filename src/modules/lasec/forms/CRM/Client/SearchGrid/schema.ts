import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from '../Schemas';
const schema: Reactory.ISchema = {
  type: 'object',
  required: ['filterBy', 'search'],
  properties: {
    actions: {
      type: 'string',
      title: 'ACTIONS',
    },
    search: {
      type: 'string',
      title: 'Search'
    },
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
    filterBy: {
      type: 'string',
      title: 'Filter By'
    },
    submit: {
      type: 'string',
      title: 'Search',
    },
    clients: {
      type: 'array',
      items: ClientSchema,
    }
  }
};

export default schema;
