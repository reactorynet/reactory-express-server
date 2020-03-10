import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientComments',
    text: `query LasecGetClientComments($id: String!, $search: String, $paging: PagingRequest){
      LasecGetClientComments(id: $id, search: $search, paging: $paging){
        paging {
          total
          page
          hasNext
          pageSize
        }
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
      'formData.id': 'id',
      'formData.paging': 'paging',
      'formData.filterBy': 'filterBy'            
    },
    resultMap: {
      'paging': 'paging',
      'comments': 'clients',      
    },  
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: true,
  },
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