import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCRMInvoices',
    text: `query LasecGetCRMInvoices(
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $filter: String
      $periodStart: String,
      $periodEnd: String,
      $dateFilter: String,
    ){
      LasecGetCRMInvoices(
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
        invoices {
          id
          invoiceDate
          quoteDate
          quoteId
          customer
          client
          dispatches
          accountNumber
          salesTeamId
          poNumber
          isoNumber
          value
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
      'formData.dateFilter': 'dateFilter',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'invoices.[].id': 'invoices.[].id',
      'invoices.[].invoiceDate': 'invoices.[].invoiceDate',
      'invoices.[].quoteDate': 'invoices.[].quoteDate',
      'invoices.[].quoteId': 'invoices.[].quoteId',
      'invoices.[].customer': 'invoices.[].customer',
      'invoices.[].client': 'invoices.[].client',
      'invoices.[].dispatches': 'invoices.[].dispatches',
      'invoices.[].accountNumber': 'invoices.[].accountNumber',
      'invoices.[].salesTeamId': 'invoices.[].salesTeamId',
      'invoices.[].poNumber': 'invoices.[].poNumber',
      'invoices.[].isoNumber': 'invoices.[].isoNumber',
      'invoices.[].value': 'invoices.[].value',
    },
    autoQuery: false,
    resultType: 'object',
    //waitUntil: '${api.utils.lodash.isNil(api.$LasecUser)===false}',
    waitTimeout: 4500,
    edit: false,
    new: false,
  },
};

export default graphql;
