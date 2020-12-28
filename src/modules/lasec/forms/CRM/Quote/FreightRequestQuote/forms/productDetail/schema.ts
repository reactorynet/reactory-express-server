import { Reactory } from '@reactory/server-core/types/reactory';

export const schema: Reactory.ISchema = {
    type: 'object',
    title: 'Product Details',
    properties: {
      productDetails: {
        type: 'string'
      },
      code: {
        type: 'string',
        title: 'Stock Code'      
      },
      description: {
        type: 'string',
        title: 'Description'
      },
      unitOfMeasure:{
            type: 'string',
            title: 'Unit of Meassure'
        },
      sellingPrice:{
          type: 'string',
          title: 'Selling Price'
      },
      qty:{
          type: 'string',
          title: 'Quantity'
      },
      length:{
          type: 'string',
          title: 'Length'
      },
      width:{
          type: 'string',
          title: 'Width'
      },
      height:{
          type: 'string',
          title: 'Height'
      },
      volume:{
          type: 'string',
          title: 'Volume'
      }
    }
  }