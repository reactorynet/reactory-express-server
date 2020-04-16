import { Reactory } from '@reactory/server-core/types/reactory';
import { FilterByEnumArray, FilterByEnumsKeys } from './shared';
import { ClientSchema } from '../Schemas';
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
    clients: {
      type: 'array',
      items: ClientSchema,
    }
  }
};

export default schema;
