import Reactory from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    product: {
      type: 'string'
    },
    supplier: {
      type: 'string'
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          }
        }
      },
    }
  }

};

export default schema;
