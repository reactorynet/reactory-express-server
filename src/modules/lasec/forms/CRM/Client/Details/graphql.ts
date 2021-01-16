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
      'formData.client.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'clientStatus': 'clientStatus',
      'fullName': 'fullName',
      'emailAddress': 'emailAddress',
      'tabs': 'tabs',
      'country': 'country',
      'customer': 'customer',
    },
    refreshEvents: [
      { name: 'LasecClientDeactivated' }
    ],
    autoQuery: false,
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
