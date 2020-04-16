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
  },
  mutation: {
    onCustomerSelected: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
        LasecUpdateNewClient(newClient: $newClient) {
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
        'eventData.formData': 'newClient.customer',
      },
      resultType: 'object',
      resultMap: {
        'customer.id':'id',
        'customer.registeredName': 'registeredName',
      },
    }
  },  
};