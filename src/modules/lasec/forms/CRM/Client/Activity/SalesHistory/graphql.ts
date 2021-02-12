import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    client_sales_history: {
      name: 'LasecGetCRMClientSalesHistory',
      text: `query LasecGetCRMClientSalesHistory(
        $clientId: String!,
        $search: String!,
        $paging: PagingRequest,
        $filterBy: String,
        $filter: String
        $periodStart: String,
        $periodEnd: String,
        $year: Int,
        $month: Int,
        $years: [Any],
      ){
        LasecGetCRMClientSalesHistory(
          clientId: $clientId,
          search: $search,
          paging: $paging,
          filterBy: $filterBy,
          filter: $filter,
          periodStart: $periodStart,
          periodEnd: $periodEnd,
          year: $year,
          month: $month,
          years: $years,
        ){
          paging {
            total
            page
            hasNext
            pageSize
          }
          year
          month
          years
          salesHistory {
            id
            accountNumber
            customer
            invoiceNumber
            iso
            poNumber
            orderDate
            quoteId
            salesOrderNumber
            orderStatus
            currency
            orderType
            deliveryAddress
            warehouseNote
            deliveryNote
            salesTeam
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
