import { Reactory } from "types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientList',
    text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $filter: String, $repCode: String){
      LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter, repCode: $repCode){
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
      'formData.filterBy': 'filterBy',
      'formData.repCode': 'repCode'
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'clients': 'clients',
    },
    
  },  
  mutation: {
    new: {
      name: 'LasecCreateNewQuoteForClient',
      text: `mutation LasecCreateNewQuoteForClient($newQuoteInput: LasecNewQuoteInput!){
        LasecCreateNewQuoteForClient(newQuoteInput: $newQuoteInput){
          success
          message
          quote_id
        }
      }`,
      objectMap: true,
      updateMessage: 'Creating new quote',
      
      variables: {
        'formData.selectedClient': 'newQuoteInput.client_id',
        'formData.repCode': 'newQuoteInput.rep_code',
      },
      options: {},
      resultMap: {
        'success': 'formData.success',
        'quote_id': 'formData.quote_id',
        'message': 'formData.message'
      },
      resultType: "object",
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        type: "success",
        title: 'New quote created',

      }
    },
  },
};

export default graphql;
