import { Reactory } from '@reactory/server-core/types/reactory';
const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecPrepareQuoteEmail',
    text: `query LasecPrepareQuoteEmail($quote_id: String!, $email_type: String){
      LasecPrepareQuoteEmail(quote_id: $quote_id, email_type: $email_type){
        id
        quote_id
        email_type
        from {
          email
          display
        }        
        subject
        body
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
          link
          filename
          mimetype
          path
        }        
      }
    }`,
    variables: {
      'formData.quote_id': 'quote_id',
      'formData.email_type': 'email_type'
    },
    autoQuery: true,
    new: true,
    resultMap: {    
        'quote_id': 'quote_id',
        'via': 'via',
        'from': 'from',
        'to': 'to',
        'bcc': 'bcc',
        'subject': 'subject',
        'body': 'message',
        'attachments': 'attachments'
    }
  },
  mutation: {
    new: {
      name: 'LasecSendQuoteEmail',
      text: `mutation LasecSendQuoteEmail($code: String!, $mailMessage: CreateEmailMessage!){
        LasecSendQuoteEmail(code: $code, mailMessage: $mailMessage){
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
        'formData.quote_id': 'code',
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
