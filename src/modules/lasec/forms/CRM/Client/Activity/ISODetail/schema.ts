import { Reactory } from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    header: {
      type: 'object',
      title: 'Header',
      properties: {
        orderDate: {
          type: 'string'
        },
        customer: {
          type: 'string'
        },
        client: {
          type: 'string'
        },
        currency: {
          type: 'string'
        },

      }
    },
    deliveryDetails: {
      type: 'object',
      title: 'Delivery Details',
      properties: {
        deliveryAddress: {
          type: 'string'
        },
        deliveryNote: {
          type: 'string'
        },
        warehouseNote: {
          type: 'string'
        }
      }
    },
    orderSummary: {
      type: 'object',
      title: 'Order Summary',
      properties: {
        orderId: {
          type: 'string'
        },
        orderType: {
          type: 'string'
        },
        poNumber: {
          type: 'string'
        },
        salesPerson: {
          type: 'string'
        },
        quoteNumber: {
          type: 'string'
        }
      }
    },
    documents: {
      type: 'string',
      title: 'Documents',
    },
    lineItems: {
      type: 'string',
      title: 'Line Items',
    },
    comments: {
      type: 'string'
    }
  }
};

export default schema;
