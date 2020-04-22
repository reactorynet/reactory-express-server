import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientList',
    text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $filter: String){
      LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter){
        paging {
          total
          page
          hasNext
          pageSize
        }
        clients {
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
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
      'formData.filterBy': 'filterBy'
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'clients': 'clients',
    },
    autoQuery: false,
    queryMessage: 'Search for client',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  }
};

export const clientLookupGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientList',
    text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $filter: String){
        LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          clients {
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
        }
      }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
      'formData.filterBy': 'filterBy'
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'clients': 'clients',
    },
    autoQuery: false,
    queryMessage: 'Search for client',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  queries: {
    pagedQuery: {
      name: 'LasecGetClientList',
      text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $filter: String){
        LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          clients {
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
        }
      }`,
      variables: {
        'formData.search': 'search',
        'formData.paging': 'paging',
        'formData.filterBy': 'filterBy'
      },
      resultMap: {
        'paging': 'paging',
        'filterBy': 'filterBy',
        'clients': 'clients',
      },
      autoQuery: false,
      queryMessage: 'Search for client',
      resultType: 'object',
      edit: false,
      new: false,
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    }
  },
  mutation: {
    onSelectClient: {
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
      updateMessage: 'Updating Customer For Client',
      variables: {
        'selected': 'newClient.customer',
      },
      resultType: 'object',
      onSuccessEvent: {
        name: 'CloseModal:LasecCRMCustomerLookupTable'
      },
      resultMap: {
        'customer.id': 'id',
        'customer.registeredName': 'registeredName',
      },
    }
  },
};

export default graphql;
