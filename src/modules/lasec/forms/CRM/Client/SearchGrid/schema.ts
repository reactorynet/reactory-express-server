import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from '../Schemas';
const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    search: {
      type: 'string'
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
    clients: {
      type: 'array',
      items: ClientSchema,
    }
  }
};

export default schema;
