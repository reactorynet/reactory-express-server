import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    quotes: {
      name: 'LasecGetCRMQuoteList',
      text: `query LasecGetCRMQuoteList(
        $search: String,
        $paging: PagingRequest,
        $filter: String
        $filterBy: String,
        $periodStart: String,
        $periodEnd: String,
        $quoteDate: String,
        $orderBy: String, 
        $orderDirection: String
        ){
        LasecGetCRMQuoteList(
          search: $search,
          paging: $paging,
          filter: $filter,
          filterBy: $filterBy,
          periodStart: $periodStart,
          periodEnd: $periodEnd,
          quoteDate: $quoteDate,
          orderBy: $orderBy,
          orderDirection: $orderDirection
          ){
          paging {
            total
            page
            hasNext
            pageSize
          }
          quotes {
            id
            code
            created
            statusName
            status
            allowed_statuses
            activeCurrency {
              id
              code
              symbol
              web_rate
            }
            customer {
              id
              fullName
              firstName
              lastName
            }
            company {
              id
              tradingName
              code
            }
            totalVATInclusive
            totalVATExclusive
            repCode
            meta
          }
        }
      }`,

      autoQuery: false,
      options: {
        fetchPolicy: 'cache-first'
      },
      queryMessage: 'Search for quote',
      resultType: 'object',
      //waitUntil: '${api.utils.lodash.isNil(api.$LasecUser)===false}',
      waitTimeout: 4500,
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
      name: 'LasecDeleteQuotes',
      text: `mutation LasecDeleteQuotes($quoteIds: [String]!){
        LasecDeleteQuotes(quoteIds: $quoteIds) {
          success
          message
        }
      }`,
      variables: {
        'selected[].code': 'quoteIds'
      },
      objectMap: true,
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Successfully deleted ${selected.length} ${selected.length > 1 ? "quotes" : "quote"}',
      },
      refreshEvents: [
        { name: 'LasecQuotesDeleted' }
      ]
    }
  }
};

export default graphql;
