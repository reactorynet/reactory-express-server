import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerList',
    text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        customers {
          id
          registeredName
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'customers': 'customers',
    },
    autoQuery: false,
    queryMessage: 'Search for customers',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  }
};

export default graphql;
