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
    edit: true,
    new: false,
  },
  mutation: {
    edit: {
      name: "LasecUpdateClientDetails",
      text: `mutation LasecUpdateClientDetails($clientInfo: ClientUpdateInput!){
        LasecUpdateClientDetails(clientInfo: $clientInfo) {
          Success
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.id': 'clientInfo.clientId',
        'formData.accountType': 'clientInfo.accountType',
        'formData.repCode': 'clientInfo.repCode',
        'formData.jobTitle': 'clientInfo.jobTitle',
        'formData.clientDepartment': 'clientInfo.clientDepartment',
        'formData.clientClass': 'clientInfo.clientClass',
        'formData.ranking': 'clientInfo.ranking',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
