import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        jobTitle
        salesTeam
        department        
        customer {
          id
          accountType
          customerClass
          ranking
        }
      }
    }`,
    variables: {
      'formData.id': 'id',            
    },
    resultMap: {      
      'customer.accountType': 'accountType',
      'salesTeam': 'repCode',
      'jobTitle': 'jobTitle',
      'department': 'department',
      'customer.customerClass': 'clientClass',
      'customer.ranking': 'ranking'
    },
    autoQuery: true,
    queryMessage: 'Loading customer job details',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;