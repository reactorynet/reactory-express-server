import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition =  {
  query: {
    name: 'LasecGetPagedCRMSalesOrders',
    text: `query LasecGetPagedCRMSalesOrders(
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $filter: String
      $periodStart: String,
      $periodEnd: String,
    ){
      LasecGetPagedCRMSalesOrders(
        search: $search,
        paging: $paging,
        filterBy: $filterBy,
        filter: $filter,
        periodStart: $periodStart,
        periodEnd: $periodEnd,
      ){
        paging {
          total
          page
          hasNext
          pageSize
        }
        salesOrders {
          id
          salesOrderNumber
          orderDate
          orderType
          orderStatus
          shippingDate
          iso
          customer
          client
          poNumber
          value,
          quoteId,
          currency
          deliveryAddress
          warehouseNote
          deliveryNote
          salesTeam
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.filterBy': 'filterBy',
      'formData.filter': 'filter',
      'formData.paging': 'paging',
      'formData.periodStart': 'periodStart',
      'formData.periodEnd': 'periodEnd',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'salesOrders.[].id': 'salesOrders.[].id',
      'salesOrders.[].salesOrderNumber': 'salesOrders.[].salesOrderNumber',
      'salesOrders.[].orderDate': 'salesOrders.[].orderDate',
      'salesOrders.[].orderType': 'salesOrders.[].orderType',
      'salesOrders.[].orderStatus': 'salesOrders.[].orderStatus',
      'salesOrders.[].shippingDate': 'salesOrders.[].shippingDate',
      'salesOrders.[].iso': 'salesOrders.[].iso',
      'salesOrders.[].customer': 'salesOrders.[].customer',
      'salesOrders.[].client': 'salesOrders.[].client',
      'salesOrders.[].poNumber': 'salesOrders.[].poNumber',
      'salesOrders.[].value': 'salesOrders.[].value',
      'salesOrders.[].quoteId': 'salesOrders.[].quoteId',
      'salesOrders.[].currency': 'salesOrders.[].currency',
      'salesOrders.[].deliveryAddress': 'salesOrders.[].deliveryAddress',
      'salesOrders.[].warehouseNote': 'salesOrders.[].warehouseNote',
      'salesOrders.[].deliveryNote': 'salesOrders.[].deliveryNote',
      'salesOrders.[].salesTeam': 'salesOrders.[].salesTeam',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
