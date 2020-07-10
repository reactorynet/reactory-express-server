import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition =  {
  query: {
    name: 'LasecGetPagedCRMSalesOrders',
    text: `query LasecGetPagedCRMSalesOrders(
      $search: String!,
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
    variables: {
      'formData.search': 'search',
      'formData.customer': 'customer',
      'formData.client': 'client',
      'formData.filterBy': 'filterBy',
      'formData.filter': 'filter',
      'formData.orderStatus': 'orderStatus',
      'formData.paging': 'paging',
      'formData.periodStart': 'periodStart',
      'formData.periodEnd': 'periodEnd',
      'formData.dateFilter': 'dateFilter',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'salesOrders.[].id': 'salesOrders.[].id',
      'salesOrders.[].salesOrderNumber': 'salesOrders.[].salesOrderNumber',
      'salesOrders.[].orderType': 'salesOrders.[].orderType',
      'salesOrders.[].orderStatus': 'salesOrders.[].orderStatus',
      'salesOrders.[].orderDate': 'salesOrders.[].orderDate',
      'salesOrders.[].shippingDate': 'salesOrders.[].shippingDate',
      'salesOrders.[].quoteDate': 'salesOrders.[].quoteDate',
      'salesOrders.[].iso': 'salesOrders.[].iso',
      'salesOrders.[].customer': 'salesOrders.[].customer',
      'salesOrders.[].crmCustomer': 'salesOrders.[].crmCustomer',
      'salesOrders.[].client': 'salesOrders.[].client',
      'salesOrders.[].poNumber': 'salesOrders.[].customerponumber',
      'salesOrders.[].value': 'salesOrders.[].value',
      'salesOrders.[].reserveValue': 'salesOrders.[].reserveValue',
      'salesOrders.[].quoteId': 'salesOrders.[].quoteId',
      'salesOrders.[].currency': 'salesOrders.[].currency',
      'salesOrders.[].deliveryAddress': 'salesOrders.[].deliveryAddress',
      'salesOrders.[].warehouseNote': 'salesOrders.[].warehouseNote',
      'salesOrders.[].deliveryNote': 'salesOrders.[].deliveryNote',
      'salesOrders.[].salesTeam': 'salesOrders.[].salesTeam',
      'salesOrders.[].shipValue': 'salesOrders.[].shipValue',
      'salesOrders.[].backorderValue': 'salesOrders.[].backorderValue',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
