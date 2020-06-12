import { Reactory } from '@reactory/server-core/types/reactory';
import { InvoiceFilterByEnumsKeys } from '../shared';

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
                InvoiceFilterByEnumsKeys.invoice_date,
                InvoiceFilterByEnumsKeys.quote_date,
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
        // {
        //   properties:
        //   {
        //     filterBy: {
        //       enum: [
        //         InvoiceFilterByEnumsKeys.order_status,
        //       ]
        //     },
        //     filter: {
        //       type: 'string',
        //       title: 'Show'
        //     }
        //   },
        // },
        {
          properties:
          {
            filterBy: {
              enum: [
                InvoiceFilterByEnumsKeys.client,
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
                InvoiceFilterByEnumsKeys.customer,
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
    salesTeam: {
      type: 'string',
      title: 'Sales Team'
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
    search: {
      type: 'string',
      title: 'Search'
    },
    filterBy: {
      type: 'string',
      title: 'FILTER BY'
    },
    invoices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
        }
      },
    }
  }
};

export default schema;
