import { Reactory } from '@reactory/server-core/types/reactory';
import version from './version';

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    new: {
      name: 'ReactorySupportRequest',
      text: `mutation ReactoryCreateSupportRequest($request: String!, $description: String, $meta: Any) {
        id
        reference
        status        
      }`,
      onSuccessMethod: "notification",
      notification: {
        inAppNotification: true,
        title: 'Your request has been generated ${formData.reference}. You will receive futher communication via email',
        props: {
          timeOut: 3000,
          canDismiss: true,
        }
      },
      onError: {
        componentRef: `core.ReactorySupportRequest@${version}`,
        method: 'onSupportRequestCreateError',
      },
    }
  }
}

export default graphql;