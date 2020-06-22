import { Reactory } from '@reactory/server-core/types/reactory';
import { SalesOrdersFilterByEnumsKeys } from '../shared';

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
                SalesOrdersFilterByEnumsKeys.date_range,
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
                SalesOrdersFilterByEnumsKeys.order_date,
                SalesOrdersFilterByEnumsKeys.shipping_date,
                SalesOrdersFilterByEnumsKeys.quote_date,
              ]
            },
            dateFilter: {
              type: 'string',
              title: 'Date',
            },
          },
        },
        {
          properties:
          {
            filterBy: {
              enum: [
                SalesOrdersFilterByEnumsKeys.order_status,
                SalesOrdersFilterByEnumsKeys.order_type,
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
                SalesOrdersFilterByEnumsKeys.client,
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
                SalesOrdersFilterByEnumsKeys.customer,
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
          reserveValue: {
            type: 'string'
          },
        }
      },
    }
  }
};

export default schema;
