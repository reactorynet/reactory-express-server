import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition =  {
  query: {
    name: 'LasecGetCRMClientSalesHistory',
    text: `query LasecGetCRMClientSalesHistory(
      $clientId: String!,
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $filter: String
      $periodStart: String,
      $periodEnd: String,
    ){
      LasecGetCRMClientSalesHistory(
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
        salesHistory {
          id
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
      'salesHistory.[].id': 'salesHistory.[].id',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

export default graphql;
