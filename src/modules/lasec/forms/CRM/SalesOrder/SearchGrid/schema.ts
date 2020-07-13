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
                FilterByEnumsKeys.date_range,
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
                FilterByEnumsKeys.order_date,
                FilterByEnumsKeys.shipping_date,
                FilterByEnumsKeys.quote_date,
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
                FilterByEnumsKeys.order_type,
                FilterByEnumsKeys.sales_team_id,
                // FilterByEnumsKeys.user_sales_team_id,
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
                FilterByEnumsKeys.client,
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
                FilterByEnumsKeys.customer,
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
    orderStatus: {
      type: 'string',
      title: 'ORDER STATUS'
    },
    // teamFilter: {
    //   title: 'Team Filter',
    //   type: 'array',
    //   items: {
    //     type: 'string',
    //     title: 'Team Id'
    //   },
    // },
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
          crmCustomer: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              registeredName: {
                type: 'string',
              },
              customerStatus: {
                type: 'string',
              }
            }
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
