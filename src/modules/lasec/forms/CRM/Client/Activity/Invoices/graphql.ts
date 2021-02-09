import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    client_invoices: {
      name: 'LasecGetCRMClientInvoices',
      text: `query LasecGetCRMClientInvoices(
        $clientId: String!,
        $salesTeamId: String!,
        $search: String!,
        $paging: PagingRequest,
        $filterBy: String,
        $filter: String
        $periodStart: String,
        $periodEnd: String,
        $dateFilter: String,
      ){
        LasecGetCRMClientInvoices(
          clientId: $clientId,
          salesTeamId: $salesTeamId,
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
          invoices {
            id
            invoiceDate
            quoteDate
            quoteId
            customer
            client
            dispatches
            accountNumber
            salesTeamId
            poNumber
            isoNumber
            value
          }
        }
      }`,
      autoQuery: false,
      resultType: 'object',
      edit: false,
      new: false,
    },
  },
};

export default graphql;
