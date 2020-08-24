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
          salesTeam
          isEmailDuplicate
          isNameDuplicate
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
