import Reactory from '@reactory/reactory-core';
import version from './version';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: {
    name: '',
    text: '',
    new: true,
    edit: true,
  },
  mutation: {
    edit: {
      name: '??',
      text: `??`,
      variables: {},
      resultMap: {},
      resultType: 'object',
      onSuccessMethod: "notification",
      notification: {
        inAppNotification: true,
        title: 'Mutation successfull',
        props: {
          timeOut: 3000,
          canDismiss: true,
        }
      },
      onSuccessRedirectTimeout: 1000,
      onSuccessUrl: '/redirect',
      onError: {
        componentRef: `core.ReactoryDefaultMutationErrorHanlder@${version}`,
        method: 'onLogMutationError',
      },
    },
    new: {
      name: '??',
      text: `??`,
      variables: {},
      resultMap: {},
      resultType: 'object',
      onSuccessMethod: "notification",
      notification: {
        inAppNotification: true,
        title: 'Mutation successfull',
        props: {
          timeOut: 3000,
          canDismiss: true,
        }
      },
      onSuccessRedirectTimeout: 1000,
      onSuccessUrl: '/redirect',
      onError: {
        componentRef: `core.ReactoryDefaultMutationErrorHanlder@${version}`,
        method: 'onLogMutationError',
      },
    }
  }
}

export default graphql;