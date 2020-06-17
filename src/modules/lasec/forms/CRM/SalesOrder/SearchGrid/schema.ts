import { Reactory } from '@reactory/server-core/types/reactory';
import { FilterByEnumArray, FilterByEnumsKeys } from './shared';

const schema: Reactory.ISchema = {
  type: 'object',
  required: ['filterBy', 'search'],
  dependencies: {
    filterBy: {
      oneOf: [
        {
          properties:
          {
            filterBy: {
              enum: [
                FilterByEnumsKeys.activity_status,
                FilterByEnumsKeys.company_on_hold,
                FilterByEnumsKeys.country,
              ]
            },
            filter: {
              type: 'string',
              title: 'SHOW'
            }
          },
        },
        {
          properties:
          {
            filterBy: {
              enum: [FilterByEnumsKeys.any_field],
            },
          }
        },
      ]
    },
  },
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
      title: 'FILTER BY'
    },
    salesOrders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          orderDate: {
            type: 'string'
          },
          orderType: {
            type: 'string'
          },
          shippingDate: {
            type: 'string'
          },
          iso: {
            type: 'string'
          },
          customer: {
            type: 'string'
          },
          client: {
            type: 'string'
          },
          poNumber: {
            type: 'string'
          },
          value: {
            type: 'string'
          },
        }
      },
    }
  }
};

export default schema;
