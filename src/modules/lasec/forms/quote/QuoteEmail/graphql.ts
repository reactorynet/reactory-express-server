import { Reactory } from '@reactory/server-core/types/reactory';
const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecPrepareQuoteEmail',
    text: `query LasecPrepareQuoteEmail($quote_id: String!, email_type: String){
      LasecPrepareQuoteEmail(quote_id: $quote_id, email_type: $email_type){
        quote_id,
        fromEmail
        fromDisplay
        subject
        message
        toList {
          email
          display
        }
        attachments {
          id
          url
          name
        }
      }
    }`,
    variables: {

    },
    autoQuery: true,
    new: true,
    resultMap: {

    }
  },
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
