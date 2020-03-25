import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    new: {
      name: "LasecAddClientComment",
      text: `mutation LasecCreateClientComment($clientComment: ClientCommentInput!){
        LasecUpdateClientDetails(clientComment: $clientComment) {
          Success
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.id': 'clientInfo.clientId',
        'formData.comment': 'clientInfo.comment',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
