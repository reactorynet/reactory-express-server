import { Reactory } from '@reactory/server-core/types/reactory';

export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient($id: String) {
      LasecGetNewClient(id: $id) {
        id
        address {
          physicalAddress {
            id
            fullAddress
          }
          deliveryAddress {
            id
            fullAddress
          }
          billingAddress {
            id
            fullAddress
          }
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'address.physicalAddress': 'physicalAddress',
      'address.deliveryAddress': 'deliveryAddress',
      'address.billingAddress': 'billingAddress',
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
    onChange: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
        LasecUpdateNewClient(newClient: $newClient) {
          id
          address {
            physicalAddress {
              id
              fullAddress
            }
            deliveryAddress {
              id
              fullAddress
            }
            billingAddress {
              id
              fullAddress
            }
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {
        'eventData.formData': 'newClient.address',
      },
      refreshEvents: [
        {
          name: "NewClient.onAddressUpdated"
        }
      ],
      resultType: 'object',
      resultMap: {
        'address': 'address'
      },
    }
  },
};
