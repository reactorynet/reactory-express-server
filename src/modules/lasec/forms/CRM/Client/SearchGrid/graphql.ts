import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientList',
    text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy){
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

export default graphql;