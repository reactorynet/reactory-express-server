import { Reactory } from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  required: ['filterBy', 'search'],
  properties: {
    orderId: {
      type: 'string',
      title: 'Sales Order #'
    },
    quoteId: {
      type: 'string',
      title: 'Quote #'
    },
    poNumber: {
      type: 'string',
      title: 'Purchase Order #'
    },
    orderDate: {
      type: 'string',
      title: 'Order Date'
    },
    customer: {
      type: 'string',
      title: 'Customer'
    },
    client: {
      type: 'string',
      title: 'Client'
    },
    orderStatus: {
      type: 'string',
      title: 'Order Status'
    },
    currency: {
      type: 'string',
      title: 'Currency'
    },
    orderType: {
      type: 'string',
      title: 'Order Type'
    },
    salesPerson: {
      type: 'string',
      title: 'Sales Person'
    },
    deliveryAddress: {
      type: 'string',
      title: 'Delivery Address'
    },
    warehouseNote: {
      type: 'string',
      title: 'Warehouse Note'
    },
    deliveryNote: {
      type: 'string',
      title: 'Delivery Note'
    },
    salesTeam: {
      type: 'string',
      title: 'Sales Team'
    },

    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          line: {
            type: 'string'
          },
          productCode: {
            type: 'string'
          },
          productDescription: {
            type: 'string'
          },
          unitOfMeasure: {
            type: 'string'
          },
          price: {
            type: 'string'
          },
          totalPrice: {
            type: 'string'
          },
          orderQty: {
            type: 'string'
          },
          shippedQty: {
            type: 'string'
          },
          backOrderQty: {
            type: 'string'
          },
          reservedQty: {
            type: 'string'
          },
          comment: {
            type: 'string'
          },
        }
      },
    }
  }
};

export default schema;
