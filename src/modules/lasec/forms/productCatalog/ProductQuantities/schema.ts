import Reactory from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    locations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          warehouse: {
            type: 'string'
          },
          qtyAvailable: {
            type: 'string'
          },
          qtyOnHand: {
            type: 'string'
          },
          qtyOnBO: {
            type: 'string'
          },
          total: {
            type: 'string'
          },
        }
      },
    }
  }

};

export default schema;
