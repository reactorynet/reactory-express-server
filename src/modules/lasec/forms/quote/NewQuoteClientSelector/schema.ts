import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from '../../CRM/Client/Schemas';
// const schema: Reactory.ISchema = {
const schema: Reactory.IObjectSchema = {
  title: '',
  type: 'object',
  properties: {
    repCode: {
      type: 'string',
      title: 'Rep Code',
    },
    search: {
      type: 'string',
      title: 'Search',
    },
    filterBy: {
      type: 'string',
      title: 'FilterBy'
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
    clients: {
      type: 'array',
      items: ClientSchema
    },
    selectedClient: {
      ...ClientSchema,
      title: 'Selected Client'
    },
  }
};

export default schema;
