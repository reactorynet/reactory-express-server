const graphql = {
  mutation: {
    new: {
      name: 'LasecSendQuoteEmail',
      text: `mutation LasecSendQuoteEmail($code: String!, $email: String!, $subject: String!, $message: String!){
        LasecSendQuoteEmail(code: $code, email: $email, subject: $subject, message: $message){
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Sending customer commnication.',
      variables: {
        'formData.code': 'code',
        'formData.customerEmail': 'email',
        'formData.subject': 'subject',
        'formData.message': 'message',
      },
      options: {},
      onSuccessMethod: '',
    },
  },
};

export default graphql;
