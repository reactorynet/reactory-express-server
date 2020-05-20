import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientComments',
    text: `query LasecGetClientComments($clientId: String!){
      LasecGetClientComments(clientId: $clientId){
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
    }`,
    variables: {
      'formContext.$ref.props.formData.id': 'clientId',
    },
    resultType: 'array',
    resultMap: {
      '[].id': 'comments.[].id',
      '[].who.fullName': 'comments.[].fullName',
      '[].who.avatar': 'comments.[].avatar',
      '[].when': 'comments.[].when',
      '[].comment': 'comments.[].comment',
    },
    queryMessage: 'Loading client comments',
    edit: true,
    new: false,
    // autoQuery: true,
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
