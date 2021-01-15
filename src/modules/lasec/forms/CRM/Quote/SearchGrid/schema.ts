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
      title: 'Search',
      default: '',
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

    filter: {
      type: 'string',
      title: 'Filter'
    },
    
    quotes: {
      type: 'array',
      items: QuotesSchema,
    }

  }
};

export default schema;
