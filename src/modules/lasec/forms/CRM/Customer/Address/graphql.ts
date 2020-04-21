import { Reactory } from '@reactory/server-core/types/reactory';

export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient {
      LasecGetNewClient {
        id
        physicalAddress {
          id
          fullAddress
          map          
        }
        deliveryAddress {
          id
          fullAddress
          map          
        }
        billingAddress {
          id
          fullAddress
          map
        }
      }
    }`,
    variables: {      
    },
    resultMap: {            
      'physicalAddress': 'physicalAddress',
      'deliveryAddress': 'physicalAddress',
      'billlingAddress': 'billlingAddress',
    },
    autoQuery: true,
    queryMessage: 'Fetch New Customer Address Detail',
    resultType: 'object',
    edit: false,
    new: true,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    onAddressSelected: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
        LasecUpdateNewClient(newClient: $newClient) {
          id
          physicalAddress {
            id
            fullAddress
            map          
          }
          deliveryAddress {
            id
            fullAddress
            map          
          }
          billingAddress {
            id
            fullAddress
            map
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {    
        'eventData.address': 'newClient.address',
      },
      resultType: 'object',
      resultMap: {
        'address': 'address'
      },
    }
  },  
};