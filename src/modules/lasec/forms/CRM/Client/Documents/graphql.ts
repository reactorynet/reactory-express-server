import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecCustomerDocuments',
    text: `query LasecCustomerDocuments($id: String, $uploadContexts: [String]){
      LasecGetCustomerDocuments(id: $id, uploadContexts: $uploadContexts){
        id
        filename
        link
        size
      }      
    }`,
    variables: {
      'formData.id': 'id',
      'formData.$uploadContexts': 'uploadContexts'            
    },
    formData: {
      $uploadContext: [
        'lasec-crm::new-company::document',
        'lasec-crm::company-document'
      ]
    },
    resultMap: {      
      '[]':'documents.[]'
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
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