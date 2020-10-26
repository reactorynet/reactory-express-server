import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientList',
    text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $filter: String, $repCode: String, $selectedClient: Any){
      LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter, repCode: $repCode, selectedClient: $selectedClient){
        paging {
          total
          page
          hasNext
          pageSize
        }
        repCode
        selectedClient
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
      'formData.repCode.value': 'repCode',
      'formData.selectedClient': 'selectedClient'
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'clients': 'clients',
      'repCode': 'repCode',
      'selectedClient': 'selectedClient'
    },

  },
  mutation: {
    new: {
      name: 'LasecCreateNewQuoteForClient',
      text: `mutation LasecCreateNewQuoteForClient($newQuoteInput: LasecNewQuoteInput!){
        LasecCreateNewQuoteForClient(newQuoteInput: $newQuoteInput){
          success
          message
          quoteId
          quoteOptionId
        }
      }`,
      objectMap: true,
      updateMessage: 'Creating new quote',

      variables: {
        'formData.selectedClient.id': 'newQuoteInput.clientId',
        'formData.repCode.value': 'newQuoteInput.repCode',
      },
      options: {},
      resultMap: {
        'success': 'formData.success',
        'quoteId': 'formData.quoteId',
        'quoteOptionId': 'formData.quoteOptionId',
        'message': 'formData.message'
      },
      resultType: "object",
      // onSuccessMethod: 'notification',
      onSuccessMethod: "event:onNewQuoteCreated",
      notification: {
        inAppNotification: true,
        type: "success",
        title: 'New quote created',

      }
    },
  },
};

export default graphql;
