import { Reactory } from "@reactory/server-core/types/reactory";


export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient {
      LasecGetNewClient {
        id
        organization {
          id
          name          
        }
      }
    }`,
    variables: {      
    },
    resultMap: {            
      'organization.id': 'id',
      'organization.name': 'name',
    },
    autoQuery: true,
    queryMessage: 'Fetch organization detail',
    resultType: 'object',
    edit: false,
    new: true,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
    refreshEvents: [
      {
        name: 'NewClient.onOrganizationSelected'
      }
    ]
  },
  mutation: {
    onOrganizationSelected: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
        LasecUpdateNewClient(newClient: $newClient) {
          id
          organization {
            id
            name            
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {    
        'eventData.formData': 'newClient.organization',
      },
      resultType: 'object',
      resultMap: {
        'organization.id':'id',
        'organization.name': 'name',
      },
    }
  },  
};