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
      'id': 'id',
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
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
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
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Job details successfully updated.',
        props: {
          timeOut: 3000,
          canDismiss: false,
        }
      },
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    }
  }
};


export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient($id: String) {
      LasecGetNewClient(id: $id) {
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
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'jobDetails.jobTitle': 'jobTitle',
      'jobDetails.jobType': 'jobType',
      'jobDetails.salesTeam': 'salesTeam',
      'jobDetails.lineManager': 'lineManager',
      'jobDetails.customerType': 'customerType',
      'jobDetails.faculty': 'faculty',
      'jobDetails.clientDepartment': 'clientDepartment',
      'jobDetails.ranking': 'ranking',
      'jobDetails.customerClass': 'customerClass',

    },
    autoQuery: true,
    queryMessage: 'Loading new customer contact details',
    resultType: 'object',
    edit: false,
    new: true,
  },
  mutation: {
    onChange: {
      // text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
      // LasecUpdateNewClient(newClient: $newClient) {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($clientId: String, $newClient: LasecNewClientInput!){
            LasecUpdateNewClient(clientId: $clientId, newClient: $newClient) {
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
        'eventData.formData.id': 'clientId',
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
        'jobDetails.clientDepartment': 'clientDepartment',
        'jobDetails.ranking': 'ranking',
        'jobDetails.customerClass': 'customerClass',
      },
    }
  },
};

export default graphql;
