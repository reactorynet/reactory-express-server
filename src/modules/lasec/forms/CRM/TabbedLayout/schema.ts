import { Reactory } from '@reactory/server-core/types/reactory';

const $toolbar = {
  type: 'object',
  title: '',
  properties: {  
    fabButton: {
      title: 'NEW',
      type: 'string',
    },
    
    view: {
      title: '',
      type: 'string'
    },    
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: '',
  properties: {
    toolbar: $toolbar,
    tabs: {      
      title: 'CRM Navigation',
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
};

export default schema;
