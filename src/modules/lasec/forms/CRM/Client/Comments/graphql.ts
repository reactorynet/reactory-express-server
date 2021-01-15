import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientComments',
    text: `query LasecGetClientComments($clientId: String!){
      LasecGetClientComments(clientId: $clientId){
          id
          comments {
            id
            comment
            when
            who {
              id
              firstName
              lastName
              fullName
              avatar
            }
          }
      }
    }`,
    variables: {
      'formContext.$ref.props.formData.id': 'clientId',
    },
    resultType: 'object',
    resultMap: {
      'id': 'id',
      'comments': 'comments',
    },
    autoQuery: true,
    queryMessage: 'Loading client comments',
    edit: true,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    new: {
      name: "LasecCRMSaveComment",
      text: `mutation LasecCRMSaveComment($clientId: String!, $comment: String!){
        LasecCRMSaveComment(clientId: $clientId, comment: $comment) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Save client comment',
      variables: {
        'formContext.$ref.props.formData.id': 'clientId',
        'formData.newComment': 'comment',
      },
      onSuccessMethod: 'refresh'
    },
    edit: {
      name: "LasecCRMSaveComment",
      text: `mutation LasecCRMSaveComment($clientId: String!, $comment: String!){
        LasecCRMSaveComment(clientId: $clientId, comment: $comment) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Save client comment',
      variables: {
        'formContext.$ref.props.formData.id': 'clientId',
        'formData.newComment': 'comment',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
