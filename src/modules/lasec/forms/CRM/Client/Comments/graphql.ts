import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientComments',
    text: `query LasecGetClientComments($id: String!, $paging: PagingRequest){
      LasecGetClientComments(id: $id, paging: $paging){
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
    },
    resultMap: {
      'paging': 'paging',
      'comments.[].id': 'data.[].id',
      'comments.[].who.firstName': 'comments.[].fullName',
      'comments.[].when': 'comments.[].when',
      'comments.[].comment': 'comments.[].comment',
    },
    queryMessage: 'Loading client comments',
    resultType: 'object',
    edit: false,
    new: true,
  },
  mutation: {
    new: {
      name: "LasecCRMSaveComment",
      text: `mutation LasecCRMSaveComment($comment: String!){
        LasecCRMSaveComment(comment: $comment) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Save client comment',
      variables: {
        'formData.comment': 'comment',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
