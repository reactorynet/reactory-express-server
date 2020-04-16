import { Reactory } from '@reactory/server-core/types/reactory';
import { QuotesSchema } from '../Schemas';
import { FilterByEnumsKeys } from './shared';
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
        // Date
        {
          properties:
          {
            filterBy: {
              enum: [
                FilterByEnumsKeys.quote_date,
              ]
            },
            dateFilter: {
              type: 'string',
              title: 'Quote Date'
            }
          },
        },
        // Dropdown
        {
          properties:
          {
            filterBy: {
              enum: [
                FilterByEnumsKeys.quote_status,
                FilterByEnumsKeys.client,
                FilterByEnumsKeys.customer,
                FilterByEnumsKeys.quote_type,
                FilterByEnumsKeys.rep_code,
              ]
            },
            selectFilter: {
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
    // periodStart: {
    //   type: 'string',
    //   title: 'Period Start',
    // },
    // periodEnd: {
    //   type: 'string',
    //   title: 'Period End',
    // },
    filterBy: {
      type: 'string',
      title: 'Filter By'
    },
    quotes: {
      type: 'array',
      items: QuotesSchema,
    }
  }
};

export default schema;
