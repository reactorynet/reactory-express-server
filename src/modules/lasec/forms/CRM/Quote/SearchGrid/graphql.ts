import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCRMQuoteList',
    text: `query LasecGetCRMQuoteList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetCRMQuoteList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        quotes {
          id
          code
          customer {
            fullName
          }
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
      'formData.filterBy': 'filterBy'
    },
    resultMap: {
      'paging': 'paging',
      'quotes': 'quotes',
    },
    autoQuery: false,
    queryMessage: 'Search for client',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;
