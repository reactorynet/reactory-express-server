export default {
  query: {
    name: 'LasecGetProductQueryDetail',
    text: `query LasecGetProductQueryDetail($productId: String!){
      LasecGetProductQueryDetail(productId: $productId){
        id        
        productCode
        productName
        productDescription
        from
        buyer
        buyerEmail
        subject
        message
      }
    }`,
    variables: {
      'formData.id': 'productId',
    },
    resultMap: {
      'productCode': 'code',
      'productName': 'name',
      'productDescription': 'description',
      'from': 'from',
      'buyer': 'buyer',
      'buyerEmail': 'buyerEmail',
      'subject': 'subject',
      'message': 'message'
    },
    resultMap: {
      '*':'*'
    },
    edit: true,
    new: true,
  },
  mutation: {
    new: {
      name: 'LasecSendProductQuery',
      text: `mutation LasecSendProductQuery($buyerEmail: String!, $subject: String!, $message: String!){
        LasecSendProductQuery(buyerEmail: $buyerEmail, subject: $subject, message: $message){
          success
          message
        }
      }`,
      updateMessage: 'Sending Product Query for ${formData.name}',
      variables: {
        'formData.buyerEmail': 'buyerEmail',
        'formData.subject': 'subject',
        'formData.message': 'message',
      },
      objectMap: true,
      resultMap: {
        '*': '*',
      },
      options: {},
    },
  },
};
