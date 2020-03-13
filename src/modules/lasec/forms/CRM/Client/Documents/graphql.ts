import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecCustomerDocuments',
    text: `query LasecCustomerDocuments($id: String!){
      LasecGetCustomerDocuments(id: $id){
        id
        name
        url
      }      
    }`,
    variables: {
      'formData.id': 'id',            
    },
    resultMap: {      
      '[]':'documents.[]'
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;