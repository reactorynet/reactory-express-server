import { Reactory } from '@reactory/server-core/types/reactory';
import { DocumentFormSchema } from '@reactory/server-modules/lasec/forms/CRM/Client/Documents/shared/DocumentFormSchema';
import { cloneDeep } from 'lodash';


const documents = cloneDeep<Reactory.ISchema>(DocumentFormSchema);
// newSchema.properties.paging = { ...PagingSchema }
documents.title = 'Documents';
documents.description = 'Attach documents to the sales order.';
documents.properties.uploadedDocuments.title = 'Uploaded files.';

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
    lineItems: {
      type: 'object',
      title: 'LineItems',
      properties: {
        id: {
          type: 'string'
        },
        // gp: {
        //   type: 'string'
        // },
        // mup: {
        //   type: 'string'
        // },
        // subTotal: {
        //   type: 'string'
        // },
        // orderValue: {
        //   type: 'string'
        // },
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
    documents: documents,
    // lineItems: {
    //   type: 'array',
    //   items: {
    //     type: 'object',
    //     title: 'Line Items',
    //     properties: {
    //       id: {
    //         type: 'string',
    //         title: 'line item id'
    //       },
    //       line: {
    //         type: 'string',
    //         title: 'Line #'
    //       },
    //       productCode: {
    //         type: 'string',
    //         title: 'Product Code'
    //       },
    //       productDescription: {
    //         type: 'string',
    //         title: 'Product Description'
    //       },
    //       unitOfMeasure: {
    //         type: 'string',
    //         title: 'Unit of Measure'
    //       },
    //       price: {
    //         type: 'number',
    //         title: 'Price'
    //       },
    //       totalPrice: {
    //         type: 'number',
    //         title: 'Total Price'
    //       },
    //       orderQty: {
    //         type: 'number',
    //         title: 'Order Quantity'
    //       },
    //       backOrderQty: {
    //         type: 'number',
    //         title: 'Back Order Quantity'
    //       },
    //       reservedQty: {
    //         type: 'number',
    //         title: 'Reserve Quantity'
    //       },
    //       comment: {
    //         type: 'string',
    //         title: 'Comment'
    //       }
    //     }
    //   }
    // },
    comments: {
      type: 'object',
      title: 'Sales Order Comments',
      properties: {

        orderId: {
          type: 'string',
          title: 'Order Id'
        },

        newComment: {
          type: 'string',
          title: 'Add Comment'
        },

        comments: {
          type: 'array',
          title: 'Comments',

          items: {
            type: 'object',
            title: 'Comment',
            properties: {

              id: {
                type: 'string',
                title: 'Comment Id'
              },

              comment: {
                type: 'string',
                title: ''
              },

              imageUrl: {
                type: 'string',
                title: ''
              },

            }
          }
        }
      }
    }
  }
};

export default schema;
