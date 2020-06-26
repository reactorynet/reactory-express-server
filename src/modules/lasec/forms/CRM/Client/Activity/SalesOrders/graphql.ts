import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
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
    variables: {
      'formData.id': 'clientId',
      'formData.search': 'search',
      'formData.filterBy': 'filterBy',
      'formData.filter': 'filter',
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
      'salesOrders.[].orderDate': 'salesOrders.[].orderDate',
      'salesOrders.[].shippingDate': 'salesOrders.[].shippingDate',
      'salesOrders.[].quoteDate': 'salesOrders.[].quoteDate',
      'salesOrders.[].orderType': 'salesOrders.[].orderType',
      'salesOrders.[].orderStatus': 'salesOrders.[].orderStatus',
      'salesOrders.[].iso': 'salesOrders.[].iso',
      'salesOrders.[].customer': 'salesOrders.[].customer',
      'salesOrders.[].client': 'salesOrders.[].client',
      'salesOrders.[].poNumber': 'salesOrders.[].poNumber',
      'salesOrders.[].quoteId': 'salesOrders.[].quoteId',
      'salesOrders.[].currency': 'salesOrders.[].currency',
      'salesOrders.[].deliveryAddress': 'salesOrders.[].deliveryAddress',
      'salesOrders.[].warehouseNote': 'salesOrders.[].warehouseNote',
      'salesOrders.[].deliveryNote': 'salesOrders.[].deliveryNote',
      'salesOrders.[].salesTeam': 'salesOrders.[].salesTeam',

      'salesOrders.[].value': 'salesOrders.[].value',
      'salesOrders.[].reserveValue': 'salesOrders.[].reserveValue',
      'salesOrders.[].shipValue': 'salesOrders.[].shipValue',
      'salesOrders.[].backorderValue': 'salesOrders.[].backorderValue',

      'salesOrders.[].documentIds': 'salesOrders.[].documentIds',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
