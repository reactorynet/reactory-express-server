import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        clientStatus
        fullName
        emailAddress      
        country
        customer {
          id
          tradingName
          accountNumber
          customerStatus
          country
        }
      }      
    }`,
    variables: {
      'formData.id': 'id',            
    },
    resultMap: {      
      'id': 'id',
      'clientStatus': 'clientStatus',
      'fullName': 'fullName',
      'customer.customerStatus': 'customerStatus', 
      'customer.accountNumber':'accountNumber',
      'customer.tradingName': 'customer',     
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;