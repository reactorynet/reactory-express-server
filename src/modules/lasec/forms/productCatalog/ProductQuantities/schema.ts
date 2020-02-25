import Reactory from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    stock: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          qtyAvailable: {
            type: 'number'
          },
          qtyOnHand: {
            type: 'number'
          },
          qtyOnBO: {
            type: 'number'
          },
        }
      },
    },
  }
};

export default schema;
