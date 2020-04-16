import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetOrganisationList',
    text: `query LasecGetOrganisationList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetOrganisationList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        organisations {
          id
          name
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
      'organisations': 'organisations',
    },
    autoQuery: false,
    queryMessage: 'Search for organisations',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  }
};

export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetOrganisationList',
    text: `query LasecGetOrganisationList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetOrganisationList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        organisations {
          id
          name
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
      'organisations': 'organisations',
    },
    autoQuery: false,
    queryMessage: 'Search for organisations',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },  
  mutation: {
    onSelectOrganization: {
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
      updateMessage: 'Updating Customer For Client',
      variables: {            
        'selected': 'newClient.organization',
      },
      resultType: 'object',
      onSuccessEvent: {
        name: 'CloseModal:LasecCRMOrganizationLookupTable'
      },
      resultMap: {
        'customer.id': 'id',
        'customer.registeredName': 'registeredName',
      },
    }
  },  
};

export default graphql;
