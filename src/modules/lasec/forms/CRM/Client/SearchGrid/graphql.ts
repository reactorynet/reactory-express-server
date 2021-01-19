import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {  
  queries: {
    clients_search: {
      name: 'LasecGetClientList',
      text: `query LasecGetClientList($search: String, $paging: PagingRequest, $filterBy: String, $filter: String, $orderBy: String, $orderDirection: String){
        LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter, orderBy: $orderBy, orderDirection: $orderDirection){
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
            salesTeam
            isEmailDuplicate
            isNameDuplicate
            customer {
              id
              tradingName
              accountNumber
              customerStatus
              salesTeam
              country
            }
          }
        }
      }`,
      variables: {
        'formData.search': 'search',
        'formData.paging.page': 'paging.page',
        'formData.paging.pageSize': 'paging.pageSize',
        'formData.filterBy': 'filterBy',
        'formData.filter': 'filter',
        'query.orderBy.field': 'orderBy',
        'query.orderDirection': 'orderDirection'
      },
      resultMap: {
        'paging': 'paging',
        'filterBy': 'filterBy',
        'clients': 'clients',
      },
      autoQuery: false,
      //autoQueryDelay: 777,    
      //waitUntil: '${api.utils.lodash.isNil(api.$LasecUser)===false}',
      //waitTimeout: 4500,
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
    deactivate: {
      name: 'LasecDeactivateClients',
      text: `mutation LasecDeactivateClients($clientIds: [String]!){
        LasecDeactivateClients(clientIds: $clientIds) {
          success
          message
        }
      }`,
      variables: {
        'selected[].id': 'clientIds' 
      },
      objectMap: true,
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Successfully deactivated ${selected.length} ${selected.length > 1 ? "clients" : "client"}',        
      },
      refreshEvents: [ 
        { name: 'LasecCustomerDeactivated' }
       ]
    }
  }
};

export default graphql;
