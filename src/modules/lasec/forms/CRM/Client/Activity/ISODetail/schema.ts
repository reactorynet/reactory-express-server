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
      type: 'array',
      items: {
        type: 'object',
        title: 'Line Items',
        properties: {
          id: {
            type: 'string',
            title: 'line item id'
          },
          line: {
            type: 'string',
            title: 'Line #'
          },
          productCode: {
            type: 'string',
            title: 'Product Code'
          },
          productDescription: {
            type: 'string',
            title: 'Product Description'
          },
          unitOfMeasure: {
            type: 'string',
            title: 'Unit of Measure'
          },
          price: {
            type: 'number',
            title: 'Price'
          },
          totalPrice: {
            type: 'number',
            title: 'Total Price'
          },
          orderQty: {
            type: 'number',
            title: 'Order Quantity'
          },
          backOrderQty: {
            type: 'number',
            title: 'Back Order Quantity'
          },
          reservedQty: {
            type: 'number',
            title: 'Reserve Quantity'
          },
          comment: {
            type: 'string',
            title: 'Comment'
          }
        }
      }
    },
    comments: {
      type: 'array',
      items: {
        type: 'string',
        title: 'Comment'
      }
    }
  }
};

export default schema;
