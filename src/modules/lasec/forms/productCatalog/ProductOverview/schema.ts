import Reactory from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    product: {
      type: 'string'
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
          },
          priceAdditionalInfo:{
            type: 'string'
          }
        }
      },
    }
  }

};

export default schema;
