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
      'formData.$uploadContexts': 'uploadContexts'            
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
  },
  mutation: {
    new: {
      name: 'LasecUploadDocument',
      text: `mutation LasecUploadDocument($file: Upload!){
        LasecUploadDocument(file: $file) {
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
