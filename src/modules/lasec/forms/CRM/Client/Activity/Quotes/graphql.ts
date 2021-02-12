import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    quotes: {
      name: 'LasecGetCRMClientQuoteList',
      text: `query LasecGetCRMClientQuoteList(
      $clientId: String!,
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $filter: String,
      $periodStart: String,
      $periodEnd: String,
      $dateFilter: String,
      ){
        LasecGetCRMClientQuoteList(
        clientId: $clientId,
        search: $search,
        paging: $paging,
        filterBy: $filterBy,
        filter: $filter,
        periodStart: $periodStart,
        periodEnd: $periodEnd,
        dateFilter: $dateFilter,
        ){
        paging {
          total
          page
          hasNext
          pageSize
        }
        clientId
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
      autoQuery: false,
      queryMessage: 'Search for quote',
      resultType: 'object',
      edit: false,
      new: false,
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    },
  },
};

export default graphql;
