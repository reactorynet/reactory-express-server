import Reactory from '@reactory/server-core/types/reactory';

const $toolbar = {
  type: 'object',
  title: '',
  properties: {
    product: {
      type: 'string',
      title: 'Product',
    },
    supplier: {
      title: 'Supplier',
      type: 'string',
    },
    submitButton: {
      title: 'Search',
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
