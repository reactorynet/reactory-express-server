import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    sales_history: {
      name: 'LasecGetCRMSalesHistory',
      text: `query LasecGetCRMSalesHistory(
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
        LasecGetCRMSalesHistory(
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
            client
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
      options: {
        fetchPolicy: 'network-only'
      },
      autoQuery: false,
      resultType: 'object',
      edit: false,
      new: false,
    },
  }  
};

export default graphql;
