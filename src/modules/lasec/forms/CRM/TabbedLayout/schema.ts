import { Reactory } from '@reactory/server-core/types/reactory';

const $toolbar = {
  type: 'object',
  title: '',
  required: ['product'],
  properties: {
    search: {
      type: 'string',
      title: 'Search',
      description: 'Enter search string',
      minLength: 3
    },
    fabButton: {
      title: '',
      type: 'string',
    }    
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: '',
  properties: {
    toolbar: $toolbar,
    tabs: {
      type: 'object',
      title: 'CRM Navigation',
      properties: {
        tabs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  }
};

export default schema;
