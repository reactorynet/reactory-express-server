import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCRMClientInvoices',
    text: `query LasecGetCRMClientInvoices(
      $clientId: String!,
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $filter: String
      $periodStart: String,
      $periodEnd: String,
    ){
      LasecGetCRMClientInvoices(
        clientId: $clientId,
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
          value
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
      'invoices.[].value': 'invoices.[].value',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
