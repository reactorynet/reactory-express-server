import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
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
      'year': 'year',
      'month': 'month',
      'years': 'years',
      'filterBy': 'filterBy',
      'salesHistory.[].id': 'salesHistory.[].id',
      'salesHistory.[].accountNumber': 'salesHistory.[].accountNumber',
      'salesHistory.[].customer': 'salesHistory.[].customer',
      'salesHistory.[].client': 'salesHistory.[].client',
      'salesHistory.[].invoiceNumber': 'salesHistory.[].invoiceNumber',
      'salesHistory.[].iso': 'salesHistory.[].isoNumber',
      'salesHistory.[].poNumber': 'salesHistory.[].poNumber',
      'salesHistory.[].orderDate': 'salesHistory.[].orderDate',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
