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
        accountType
        customer {
          id
          tradingName
          accountNumber
          customerStatus
          country
          creditLimit
          currentBalance
          currencyCode
          currencySymbol
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
      'accountType': 'accountType',
      'customer.customerStatus': 'customerStatus',
      'customer.accountNumber': 'accountNumber',
      'customer.tradingName': 'customer',
      'customer.currentBalance': 'currentBalance',
      'customer.creditLimit': 'creditLimit',
      'customer.currencyCode': 'currency',
    },
    options: {
      fetchOptions: 'cache-first',
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;