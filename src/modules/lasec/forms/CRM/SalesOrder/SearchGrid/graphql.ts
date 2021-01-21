import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition =  {
  queries: {
    sales_orders: {
      name: 'LasecGetPagedCRMSalesOrders',
      text: `query LasecGetPagedCRMSalesOrders(
        $search: String,
        $paging: PagingRequest,
        $filterBy: String,
        $filter: String,
        $customer: [String],
        $client: [String],
        $orderStatus: String,
        $periodStart: String,
        $periodEnd: String,
        $dateFilter: String,
      ){
        LasecGetPagedCRMSalesOrders(
          search: $search,
          paging: $paging,
          filterBy: $filterBy,
          filter: $filter,
          orderStatus: $orderStatus,
          periodStart: $periodStart,
          periodEnd: $periodEnd,
          dateFilter: $dateFilter,
          customer: $customer,
          client: $client,
        ){
          paging {
            total
            page
            hasNext
            pageSize
          }
          salesOrders {
            id
            orderType
            orderStatus
            salesOrderNumber
            orderDate
            shippingDate
            quoteDate
            orderType
            orderStatus
            iso
            customer
            client
            crmCustomer {
              id
              registeredName
              customerStatus 
            }
            poNumber
            value,
            reserveValue
            quoteId,
            currency
            deliveryAddress
            warehouseNote
            deliveryNote
            salesTeam
            shipValue
            backorderValue
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
