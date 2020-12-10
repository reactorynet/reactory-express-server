import { Reactory } from "@reactory/server-core/types/reactory";


export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient {
      LasecGetNewClient {
        id
        customer {
          id
          registeredName
        }
      }
    }`,
    variables: {
    },
    resultMap: {
      'customer.id': 'id',
      'customer.registeredName': 'registeredName',
    },
    autoQuery: true,
    queryMessage: 'Fetch customer detail',
    resultType: 'object',
    edit: false,
    new: true,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
    refreshEvents: [
      { name: 'NewClient.onCustomerSelected'},
      { name: "LasecNewClient::onResetForm" }
    ]    
  },
  mutation: {
    onCustomerSelected: {
      // text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
      // LasecUpdateNewClient(newClient: $newClient) {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($clientId: String, $newClient: LasecNewClientInput!){
            LasecUpdateNewClient(clientId: $clientId, newClient: $newClient) {
          id
          customer {
            id
            registeredName
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {
        'eventData.formData.id': 'clientId',
        'eventData.formData': 'newClient.customer',
      },
      resultType: 'object',
      resultMap: {
        'customer.id': 'id',
        'customer.registeredName': 'registeredName',
      },
    }
  },
};
