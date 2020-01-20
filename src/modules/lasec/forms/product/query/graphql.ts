const graphql = {
  query: {
    name: 'LasecGetProductQueryDetail',
    text: `query LasecGetProductQueryDetail($productId: String!){
      LasecGetProductQueryDetail(productId: $productId){
        id
      }
    }`,
    variables: {
      'formData.code': 'productId',
    },
    edit: true,
    new: true,
  },
  // mutation: {
  //   new: {
  //     name: 'LasecSendProductQuery',
  //     text: `mutation LasecSendProductQuery($product_id: String!, $subject: !String, $message: !String){
  //       LasecSendProductQuery(product_id: $product_id, subject: $subject, message: $message){
  //         success
  //         message
  //       }
  //     }`,
  //     objectMap: true,
  //     updateMessage: 'Sending Product Query for ${formData.name}',
  //     variables: {
  //       'formData.code': 'product_id',
  //       'formData.subject': 'subject',
  //       'formData.message': 'message',
  //     },
  //     // options: {
  //     //   refetchQueries: ['LasecGetQuoteById($quote_id: String!)'],
  //     // },
  //     // onSuccessMethod: 'event:UpdateQuoteStatus_onMutationSuccess',
  //   },
  // },
};

export default graphql;
