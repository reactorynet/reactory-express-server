import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  queries: {
    client_sales_history: {
      name: 'LasecGetCRMClientSalesHistory',
      text: `query LasecGetCRMClientSalesHistory(
        $clientId: String!,
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
        LasecGetCRMClientSalesHistory(
          clientId: $clientId,
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
      // id
      //       orderType
      //       quoteDate
      //       quoteNumber
      //       orderDate
      //       iso
      //       dispatches
      //       customer
      //       client
      //       poNumber
      //       value
      //       salesTeamId
      // variables: {
      //   'formData.id': 'clientId',
      //   'formData.search': 'search',
      //   'formData.filterBy': 'filterBy',
      //   'formData.filter': 'filter',
      //   'formData.paging': 'paging',


      //   'formData.periodStart': 'periodStart',
      //   'formData.periodEnd': 'periodEnd',
      //   'formData.year': 'year',
      //   'formData.years': 'years',
      //   'formData.month': 'month',

      // },
      // resultMap: {
      //   'paging': 'paging',
      //   'filterBy': 'filterBy',

      //   'year': 'year',
      //   'years': 'years',
      //   'month': 'month',

      //   'salesHistory.[].id': 'salesHistory.[].id',
      //   'salesHistory.[].orderType': 'salesHistory.[].orderType',
      //   'salesHistory.[].quoteDate': 'salesHistory.[].quoteDate',
      //   'salesHistory.[].quoteNumber': 'salesHistory.[].quoteNumber',
      //   'salesHistory.[].orderDate': 'salesHistory.[].orderDate',
      //   'salesHistory.[].iso': 'salesHistory.[].isoNumber',
      //   'salesHistory.[].dispatches': 'salesHistory.[].dispatches',
      //   'salesHistory.[].customer': 'salesHistory.[].customer',
      //   'salesHistory.[].client': 'salesHistory.[].client',
      //   'salesHistory.[].poNumber': 'salesHistory.[].poNumber',
      //   'salesHistory.[].value': 'salesHistory.[].value',
      //   'salesHistory.[].salesTeamId': 'salesHistory.[].salesTeamId',
      // },
      autoQuery: false,
      resultType: 'object',
      edit: false,
      new: false,
    },
  },
};

export default graphql;
