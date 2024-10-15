import Reactory from '@reactory/reactory-core';
import version from './version';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    new: {
      name: 'ReactoryCreateSupportTicket',
      text: `mutation ReactoryCreateSupportTicket($request: String!, $description: String!, $meta: Any) {
        ReactoryCreateSupportTicket(request: $request, description: $description, meta: $meta) {
          id
          reference
          status
        }        
      }`,
      variables: {
        'formData.request': 'request',
        'formData.description': 'description'
      },
      resultMap: {
        'reference': 'reference',
        'status': 'status',
        'id': 'id'
      },
      resultType: 'object',
      onSuccessMethod: ["notification", "redirect"],
      notification: {
        inAppNotification: true,
        title: 'support-ticket.notification.onCreated',
        props: {
          timeOut: 3000,
          canDismiss: true,
        }
      },
      onSuccessRedirectTimeout: 1000,
      onSuccessUrl: '/support/open',
      onError: {
        componentRef: `core.ReactorySupportRequest@${version}`,
        method: 'onSupportRequestCreateError',
      },
    }
  }
}

export default graphql;