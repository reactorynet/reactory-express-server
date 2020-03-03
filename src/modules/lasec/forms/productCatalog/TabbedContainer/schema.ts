import { Reactory } from '@reactory/server-core/types/reactory';

const $toolbar = {
  type: 'object',
  title: '',
  required: ['product'],
  properties: {
    product: {
      type: 'string',
      title: 'Search',
      format: "search",
      description: 'Enter a product code or description',
      minLength: 3
    },
    submitButton: {
      title: 'Search',
      type: 'string',
    },
    resultCount: {
      title: '',
      type: 'number'
    },
    view: {
      title: '',
      type: 'string'
    }
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: '',
  properties: {
    toolbar: $toolbar,
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

};

export default schema;
