import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition =  {
  query: {
    name: 'LasecGetCRMClientSalesOrders',
    text: `query LasecGetCRMClientSalesOrders(
      $clientId: String!,
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $periodStart: String,
      $periodEnd: String,
      $quoteDate: String,
    ){
      LasecGetCRMClientSalesOrders(
        clientId: $clientId,
        search: $search,
        paging: $paging,
        filterBy: $filterBy,
        periodStart: $periodStart,
        periodEnd: $periodEnd,
        quoteDate: $quoteDate,
      ){
        paging {
          total
          page
          hasNext
          pageSize
        }
        salesOrders {
          id
          orderDate
          orderType
          shippingDate
          iso
          customer
          client
          poNumber
          value
        }
      }
    }`,
    variables: {
      'formData.id': 'clientId',
      'formData.search': 'search',
      'formData.filterBy': 'filterBy',
      'formData.paging': 'paging',
      'formData.periodStart': 'periodStart',
      'formData.periodEnd': 'periodEnd',
      'formData.dateFilter': 'quoteDate',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'salesOrders.[].id': 'salesOrders.[].id',
      'salesOrders.[].orderDate': 'salesOrders.[].orderDate',
      'salesOrders.[].orderType': 'salesOrders.[].orderType',
      'salesOrders.[].shippingDate': 'salesOrders.[].shippingDate',
      'salesOrders.[].iso': 'salesOrders.[].iso',
      'salesOrders.[].customer': 'salesOrders.[].customer',
      'salesOrders.[].client': 'salesOrders.[].client',
      'salesOrders.[].poNumber': 'salesOrders.[].poNumber',
      'salesOrders.[].value': 'salesOrders.[].value',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
