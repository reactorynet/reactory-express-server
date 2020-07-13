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
    ){
      LasecGetCRMSalesHistory(
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
        salesHistory {
          id
          orderType
          quoteDate
          quoteNumber
          orderDate
          iso
          dispatches
          customer
          client
          poNumber
          value
          salesTeamId
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
      'salesHistory.[].id': 'salesHistory.[].id',
      'salesHistory.[].orderType': 'salesHistory.[].orderType',
      'salesHistory.[].quoteDate': 'salesHistory.[].quoteDate',
      'salesHistory.[].quoteNumber': 'salesHistory.[].quoteNumber',
      'salesHistory.[].orderDate': 'salesHistory.[].orderDate',
      'salesHistory.[].iso': 'salesHistory.[].isoNumber',
      'salesHistory.[].dispatches': 'salesHistory.[].dispatches',
      'salesHistory.[].customer': 'salesHistory.[].customer',
      'salesHistory.[].client': 'salesHistory.[].client',
      'salesHistory.[].poNumber': 'salesHistory.[].poNumber',
      'salesHistory.[].value': 'salesHistory.[].value',
      'salesHistory.[].salesTeamId': 'salesHistory.[].salesTeamId',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
