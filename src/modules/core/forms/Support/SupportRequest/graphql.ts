import { Reactory } from '@reactory/server-core/types/reactory';
import version from './version';

const graphql: Reactory.IFormGraphDefinition = {
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
      onSuccessMethod: "notification",
      notification: {
        inAppNotification: true,
        title: 'Your request has been generated ${formData.reference}. You will receive futher communication via email',
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