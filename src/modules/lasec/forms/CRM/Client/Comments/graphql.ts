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
      'formData.id': 'clientId',
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
    edit: false,
    new: false,
    autoQuery: false,
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
        'formData.id': 'clientId',
        'formData.comment': 'comment',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
