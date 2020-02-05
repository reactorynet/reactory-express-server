import Reactory from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    product: {
      type: 'string'
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string'
          },
          name: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          qtyAvailable: {
            type: 'number'
          },
          qtyOnHand: {
            type: 'number'
          },
          qtyOnOrder: {
            type: 'number'
          },
          unitOfMeasure: {
            type: 'string'
          },
          price: {
            type: 'number'
          },
          onSyspro:{
            type: 'string'
          }
        }
      },
    }
  }

};

export default schema;
