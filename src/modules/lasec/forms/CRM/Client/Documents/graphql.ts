import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerDocuments',
    text: `query LasecGetCustomerDocuments($uploadContexts: [String], $paging: PagingRequest){
      LasecGetCustomerDocuments(uploadContexts: $uploadContexts, paging: $paging){
        paging {
          total
          page
          pageSize
        }
        documents {
          id
          filename
          link
          size
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
      'formData.$uploadContexts': 'uploadContexts',
      'formData.paging': 'paging'
    },
    formData: {
      $uploadContext: [
        'lasec-crm::new-company::document',
        'lasec-crm::company-document'
      ]
    },
    autoQuery: true,
    queryMessage: 'Loading customer documents',
    resultType: 'object',
    edit: false,
    new: false,
    refreshEvents: [
      {name: 'lasec-crm::new-document::uploaded'}
    ],
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    new: {
      name: 'LasecUploadCustomerDocument',
      text: `mutation LasecUploadCustomerDocument($id: String, $file: Upload!){
        LasecUploadCustomerDocument(id: $id, file: $file) {
          id
          name
          url
          mimetype
        }
      }`,
      notification: {

      },
      variables: {

      },
      objectMap: true,

    }
  }
};

export default graphql;
