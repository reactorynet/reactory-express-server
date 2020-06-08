import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        customer {
          id
          customerStatus
          registeredName
          tradingName
          currencyDisplay
          description
          physicalAddressId
          physicalAddress
          deliveryAddressId
          deliveryAddress
          billingAddressId
          billingAddress
          registrationNumber
          taxNumber
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'customer.customerStatus': 'customerStatus',
      'customer.registeredName': 'registeredCompanyName',
      'customer.tradingName': 'tradingName',
      'customer.currencyDisplay': 'tradingCurrency',
      'customer.description': 'description',
      'customer.physicalAddress': 'physicalAddress',
      'customer.deliveryAddress': 'deliveryAddress',
      'customer.billingAddress': 'billingAddress',
      'customer.registrationNumber': 'registrationNumber',
      'customer.taxNumber': 'taxNumber'
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  }
};

export default graphql;
