import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerList',
    text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        customers {
          id
          registeredName
          country
          accountNumber
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'customers': 'customers',
    },
    autoQuery: false,
    queryMessage: 'Search for customers',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    onSelectCustomer: {
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
      updateMessage: 'Selecting Organization',
      variables: {    
        'selected.id': 'newClient.customer.id',
        'selected.registeredName': 'newClient.customer.registeredName'
      },      
      onSuccessEvent: {
        name: 'CloseModal:LasecCRMCustomerLookupTable',        
      }
    }
  }
};

export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerList',
    text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        customers {
          id
          registeredName
          country
          accountNumber
        }
      }
    }`,
    variables: {
      'props.formContext.$formData.search': 'search',
      'props.formContext.$formData.paging': 'paging',        
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'customers': 'data',
    },
    autoQuery: false,
    queryMessage: 'Search for customers',
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
      name: 'LasecGetCustomerList',
      text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
        LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
          paging {
            total
            page
            hasNext
            pageSize
          }
          customers {
            id
            registeredName
            country
            accountNumber
          }
        }
      }`,
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',        
      },
      resultMap: {
        'paging': 'paging',
        'filterBy': 'filterBy',
        'customers': 'data',
      },
      autoQuery: false,
      queryMessage: 'Search for customers',
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
    onSelectCustomer: {
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
