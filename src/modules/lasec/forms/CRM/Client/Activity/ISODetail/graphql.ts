import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetISODetail',
    text: `query LasecGetISODetail($orderId: String!) {
      LasecGetISODetail(orderId: $orderId) {
        lineItems {
          id
          line
          productCode
          productDescription
          unitOfMeasure
          price
          totalPrice
          orderQty
          shippedQty
          backOrderQty
          reservedQty
          comment
          image
        }
        comments {
          comment
        }
      }
    }`,
    variables: {
      'formData.orderId': 'orderId',
    },
    resultType: 'object',
    resultMap: {
      'header': 'header',
      'deliveryDetails': 'deliveryDetails',
      'orderSummary': 'orderSummary',
      'documents': 'documents',
      'lineItems[].id': 'lineItems[].id',
      'lineItems[].line': 'lineItems[].line',
      'lineItems[].productCode': 'lineItems[].productCode',
      'lineItems[].productDescription': 'lineItems[].productDescription',
      'lineItems[].unitOfMeasure': 'lineItems[].unitOfMeasure',
      'lineItems[].price': 'lineItems[].price',
      'lineItems[].totalPrice': 'lineItems[].totalPrice',
      'lineItems[].orderQty': 'lineItems[].orderQty',
      'lineItems[].shippedQty': 'lineItems[].shippedQty',
      'lineItems[].backOrderQty': 'lineItems[].backOrderQty',
      'lineItems[].reservedQty': 'lineItems[].reservedQty',
      'lineItems[].comment': 'lineItems[].comment',
      'lineItems[].image': 'lineItems[].image',
      'comments[].comment': 'comments.[].comment'
    },
    // autoQuery: true,
    edit: false,
    new: false,
  },
};

export default graphql;
