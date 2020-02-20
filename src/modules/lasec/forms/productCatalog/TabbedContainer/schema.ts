import Reactory from '@reactory/server-core/types/reactory';

const $toolbar = {
  type: 'object',
  title: '',
  properties: {
    product: {
      type: 'string',
      title: 'Product',
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
      type: 'object',
      title: 'Tabbed Navigation',
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
