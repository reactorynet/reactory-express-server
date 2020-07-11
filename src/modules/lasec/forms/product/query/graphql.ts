export default {
 
  mutation: {
    new: {
      name: 'LasecSendProductQuery',
      text: `mutation LasecSendProductQuery($toEmail: String!, $subject: String!, $message: String!){
        LasecSendProductQuery(toEmail: $toEmail, subject: $subject, message: $message){
          success
          message
        }
      }`,
      updateMessage: 'Sending Product Query for ${formData.name}',
      variables: {
        'formData.toEmail': 'toEmail',
        'formData.subject': 'subject',
        'formData.message': 'message',
      },
      objectMap: true,
      resultMap: {
        '*': '*',
      },
      options: {},
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Product inquiry sent',
        props: {
          timeOut: 3000,
          canDismiss: true,          
        }
      },
    },
  },
};
