import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    client_sales_orders: {
      name: 'LasecGetCRMClientSalesOrders',
      text: `query LasecGetCRMClientSalesOrders(
        $clientId: String!,
        $search: String!,
        $paging: PagingRequest,
        $filterBy: String,
        $filter: String
        $periodStart: String,
        $periodEnd: String,
        $dateFilter: String,
      ){
        LasecGetCRMClientSalesOrders(
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
          salesOrders {
            id
            salesOrderNumber
            orderDate
            shippingDate
            quoteDate
            orderType
            orderStatus
            iso
            customer
            client
            poNumber
            quoteId,
            currency
            deliveryAddress
            warehouseNote
            deliveryNote
            salesTeam

            value,
            reserveValue
            shipValue
            backorderValue

            documentIds
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
