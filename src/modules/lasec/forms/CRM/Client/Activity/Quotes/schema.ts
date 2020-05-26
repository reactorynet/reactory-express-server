import { Reactory } from '@reactory/server-core/types/reactory';
import { FilterByEnumsKeys } from '../shared';

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
    quotes: {
      type: 'array',
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            title: "Client Id"
          },
          code: {
            type: "string",
            title: "Quote Number"
          },
          date: {
            type: "string",
            title: "Quote Date"
          },
        }
      },
    }
  }
};

export default schema;
