import { Reactory } from '@reactory/server-core/types/reactory';
import { SalesHistoryFilterByEnumsKeys } from '../shared';

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
                SalesHistoryFilterByEnumsKeys.order_date,
                SalesHistoryFilterByEnumsKeys.quote_date,
              ]
            },
            periodStart: {
              type: 'string',
              title: 'Period Start',
            },
            periodEnd: {
              type: 'string',
              title: 'Period End',
            },
          },
        },
        {
          properties:
          {
            filterBy: {
              enum: [
                SalesHistoryFilterByEnumsKeys.order_type,
              ]
            },
            filter: {
              type: 'string',
              title: 'Show'
            }
          },
        },
        {
          properties:
          {
            filterBy: {
              enum: [
                SalesHistoryFilterByEnumsKeys.client,
              ]
            },
            client: {
              type: 'string',
              title: 'Show'
            }
          },
        },
        {
          properties:
          {
            filterBy: {
              enum: [
                SalesHistoryFilterByEnumsKeys.customer,
              ]
            },
            customer: {
              type: 'string',
              title: 'Show'
            }
          },
        },
      ]
    },
  },
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
    month: {
      type: 'string',
      title: 'FILTER BY MONTH'
    },
    year: {
      type: 'string',
      title: 'FILTER BY YEAR'
    },
    salesHistory: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          orderType: {
            type: 'string'
          },
          quoteDate: {
            type: 'string'
          },
          quoteNumber: {
            type: 'string'
          },
          orderDate: {
            type: 'string'
          },
          isoNumber: {
            type: 'string'
          },
          dispatches: {
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
          salesTeamId: {
            type: 'string'
          },
        }
      },
    }
  }
};

export default schema;
