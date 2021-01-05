import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCRMQuoteList',
    text: `query LasecGetCRMQuoteList(
      $search: String!,
      $paging: PagingRequest,
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
          totalVATInclusive
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
          totalVATExclusive
          repCode
          meta
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
      'formData.filterBy': 'filterBy',
      'formData.periodStart': 'periodStart',
      'formData.periodEnd': 'periodEnd',
      'formData.dateFilter': 'quoteDate',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'quotes': 'quotes',
      'quotes[].code': 'quotes[].code',
      'quotes[].customer.fullName': 'quotes.client',
      'quotes[].created': 'quotes[].created',
      'quotes[].statusName': 'quotes[].status',
      'quotes[].status': 'quotes[].quote_status',
      'quotes[].allowed_statuses': 'quotes[].allowed_statuses',
      'quotes[].totalVATInclusive': 'quotes[].total',
      'quotes[].company.tradingName': 'quotes[].companyTradingName',
      'quotes[].accountNumber': 'quotes[].accountNumber',
      'quotes[].meta.source.sales_team_id': 'quotes[].repCode',
      'quotes[].meta.source.quote_type': 'quotes[].quoteType',
    },
    autoQuery: false,
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
