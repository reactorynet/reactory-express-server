import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id        
        customer {
          id
          currencySymbol
          creditLimit
          currentBalance
          currentInvoice
          balance30Days
          balance60Days
          balance90Days
          balance120Days
          creditTotal 
        }
      }      
    }`,
    variables: {
      'formData.id': 'id',            
    },
    resultMap: {      
      'id': 'id',
      'customer.creditLimit': 'creditLimit', 
      'customer.currencySymbol': 'currencySymbol',
      'customer.currentBalance': 'currentBalance', 
      'customer.currentInvoice': 'currentInvoice', 
      'customer.balance30Days': 'balance30Days', 
      'customer.balance60Days': 'balance60Days', 
      'customer.balance90Days': 'balance90Days', 
      'customer.balance120Days': 'balance120Days', 
      'customer.creditTotal': 'creditTotal', 
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;