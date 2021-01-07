import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerDocuments',
    text: `query LasecGetCustomerDocuments($id: String, $uploadContexts: [String], $paging: PagingRequest){
      LasecGetCustomerDocuments(id: $id, uploadContexts: $uploadContexts, paging: $paging){
        documents {
          id
          filename
          mimetype
          link
          size
          owner {
            id
            firstName
            fullName
          }
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
      'formData.$uploadContexts': 'uploadContexts',
    },
    formData: {
      $uploadContexts: [
        'lasec-crm::company-document',
        'lasec-crm::new-company::document'
      ]
    },
    resultMap: {
      'documents': 'documents',
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
