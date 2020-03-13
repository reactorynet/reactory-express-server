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
          created
          statusName
          totalVATInclusive
          customer {
            id
            fullName
          }
          company {
            id
            tradingName
          }
          totalVATExclusive
          totalVAT
          GP
          actualGP
          modified
          expirationDate
          note
          salesRep {
            username
            organization {
              code
            }
          }
          salesTeam {
            title
            organization {
              code
            }
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
      'quotes[].code': 'quotes[].code',
      'quotes[].created': 'quotes[].date',
      'quotes[].statusName': 'quotes[].status',
      'quotes[].totalVATInclusive': 'quotes[].total',

      'quotes[].customer.fullName': 'quotes[].customerName',
      'quotes[].company.tradingName': 'quotes[].companyTradingName',
    },
    autoQuery: false,
    queryMessage: 'Search for client',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;
