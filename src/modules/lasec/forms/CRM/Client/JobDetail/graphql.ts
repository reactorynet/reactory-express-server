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


export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient {
      LasecGetNewClient {
        id
        jobDetails {
          jobTitle
          jobType
          salesTeam
          lineManager
          customerType
          faculty
          clientDepartment
          ranking
          customerClass
        }
      }
    }`,
    variables: {    
      
    },
    resultMap: {
      'id': 'id',
      'jobDetails.jobTitle': 'jobTitle',      
      'jobDetails.jobType': 'jobType',
      'jobDetails.salesTeam': 'salesTeam',
      'jobDetails.lineManager': 'lineManager',
      'jobDetails.customerType': 'customerType',
      'jobDetails.faculty': 'faculty',                        
      'jobDetails.clientDepartment':'clientDepartment',
      'jobDetails.ranking':'ranking',
      'jobDetails.customerClass':'customerClass',

    },
    autoQuery: true,
    queryMessage: 'Loading new customer contact details',
    resultType: 'object',
    edit: false,
    new: true,
  },
  mutation: {
    onChange: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
        LasecUpdateNewClient(newClient: $newClient) {
          id
          jobDetails {
            jobTitle
            jobType
            salesTeam
            lineManager
            customerType
            faculty
            clientDepartment
            ranking
            customerClass
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Personal Content',
      variables: {    
        'eventData.formData': 'newClient.jobDetails',
      },
      // handledBy: 'onChange',
      resultType: 'object',
      resultMap: {
        'id': 'id',
        'jobDetails.jobTitle': 'jobTitle',      
        'jobDetails.jobType': 'jobType',
        'jobDetails.salesTeam': 'salesTeam',
        'jobDetails.lineManager': 'lineManager',
        'jobDetails.customerType': 'customerType',
        'jobDetails.faculty': 'faculty',                        
        'jobDetails.clientDepartment':'clientDepartment',
        'jobDetails.ranking':'ranking',
        'jobDetails.customerClass':'customerClass',     
      },
    }
  },  
};

export default graphql;
