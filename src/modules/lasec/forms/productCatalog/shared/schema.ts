import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    product: {
      type: 'string',
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
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
          },
          buyer:{
            type: 'string'
          },
          planner:{
            type: 'string'
          },
          isHazardous:{
            type: 'string'
          },
          siteEvaluationRequired:{
            type: 'string'
          },
          numberOfSalesOrders:{
            type: 'number'
          },
          numberOfPurchaseOrders:{
            type: 'number'
          },

          supplier:{
            type: 'string'
          },
          model:{
            type: 'string'
          },
          shipmentSize:{
            type: 'string'
          },
          exWorksFactor:{
            type: 'string'
          },


        }
      },
    }
  }
};

export default schema;
