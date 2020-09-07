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
          totalVATInclusive
          customer {
            id
            fullName
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
      'quotes[].created': 'quotes[].created',
      'quotes[].statusName': 'quotes[].status',
      'quotes[].totalVATInclusive': 'quotes[].total',
      'quotes[].company.tradingName': 'quotes[].companyTradingName',
      'quotes[].accountNumber': 'data[].accountNumber',
      'quotes[].meta.source.sales_team_id': 'data[].repCode',
      'quotes[].meta.source.quote_type': 'data[].quoteType',
    },
    autoQuery: false,
    queryMessage: 'Search for quote',
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
