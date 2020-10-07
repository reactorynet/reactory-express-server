import { Reactory } from '@reactory/server-core/types/reactory';
const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecPrepareQuoteEmail',
    text: `query LasecPrepareQuoteEmail($quote_id: String!, $email_type: String){
      LasecPrepareQuoteEmail(quote_id: $quote_id, email_type: $email_type){
        from {
          email
          display
        }        
        subject
        message
        to {
          email
          display
        }
        cc {
          email
          display
        }
        bcc {
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
      'formData.code': 'quote_id',
      'formData.email_type': 'email_type'
    },
    autoQuery: true,
    new: true,
    resultMap: {

    }
  },
  mutation: {
    new: {
      name: 'LasecSendQuoteEmail',
      text: `mutation LasecSendQuoteEmail($code: String!, $mailMessage: CreateEmailMessage){
        LasecSendQuoteEmail(code: $code, email: $email, subject: $subject, message: $message){
          success
          message
        }
      }`,
      objectMap: true,
      formData: {
        via: 'microsoft'
      },
      updateMessage: 'Sending customer commnication.',
      variables: {
        'formData.code': 'code',
        'formData.via': 'mailMessage.via',
        'formData.from': 'mailMessage.from',
        'formData.to': 'mailMessage.to',
        'formData.bcc': 'mailMessage.bcc',
        'formData.subject': 'mailMessage.subject',
        'formData.message': 'mailMessage.message',
        'formData.attachments': 'mailMessage.attachments'
      },
      options: {},
      onSuccessMethod: '',
    },
  },
};

export default graphql;
