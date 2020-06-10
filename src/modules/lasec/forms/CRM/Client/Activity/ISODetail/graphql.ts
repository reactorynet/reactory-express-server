import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetISODetail',
    text: `query LasecGetISODetail($orderId: String!) {
      LasecGetISODetail(orderId: $orderId) {
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
      }
    }`,
    variables: {
      'formData.orderId': 'orderId',
    },
    resultType: 'array',
    resultMap: {
      '[].id': 'lineItems[].id',
      '[].line': 'lineItems[].line',
      '[].productCode': 'lineItems[].productCode',
      '[].productDescription': 'lineItems[].productDescription',
      '[].unitOfMeasure': 'lineItems[].unitOfMeasure',
      '[].price': 'lineItems[].price',
      '[].totalPrice': 'lineItems[].totalPrice',
      '[].orderQty': 'lineItems[].orderQty',
      '[].shippedQty': 'lineItems[].shippedQty',
      '[].backOrderQty': 'lineItems[].backOrderQty',
      '[].reservedQty': 'lineItems[].reservedQty',
      '[].comment': 'lineItems[].comment',
    },
    // autoQuery: true,
    edit: false,
    new: false,
  },
};

export default graphql;
