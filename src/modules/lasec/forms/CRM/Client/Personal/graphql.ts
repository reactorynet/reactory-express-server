import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        clientStatus
        firstName
        lastName
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
      'country': 'country',
      'firstName' : 'firstName',
      'lastName': 'lastName',
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  },
  mutation: {
    edit: {
      name: "LasecUpdateClientDetails",
      text: `LasecUpdateClientDetails($clientInfo: ClientUpdateInput!){
        LasecUpdateClientDetails(clientInfo: $clientInfo) {
          Success
        }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.id': 'clientInfo.clientId',
        'formData.clientStatus': 'clientInfo.clientStatus',
        'formData.firstName': 'clientInfo.firstName',
        'formData.lastName': 'clientInfo.lastName',
        'formData.country': 'clientInfo.country',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
