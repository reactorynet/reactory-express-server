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
        faculty
        customerType
        lineManager
        lineManagerLabel
        jobType
        jobTypeLabel
        customerClassLabel
        customer {
          id
          accountType
          customerClass
          ranking
          rankingLabel
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
      'department': 'clientDepartment',
      'customer.customerClass': 'customerClass',
      'customerClassLabel': 'customerClassLabel',
      'customer.id': 'customerId',
      'customer.ranking': 'ranking',
      'customer.rankingLabel': 'rankingLabel',

      'faculty': 'faculty',
      'customerType': 'customerType',
      'lineManager': 'lineManager',
      'lineManagerLabel': 'lineManagerLabel',
      'jobType': 'jobType',
      'jobTypeLabel': 'jobTypeLabel',

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
          Client {
            id
            jobTitle
            salesTeam
            department

            faculty
            customerType
            lineManager
            lineManagerLabel
            jobType
            jobTypeLabel

            customer {
              id
              accountType
              customerClass
              ranking
            }
          }
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
        'formData.customerClass': 'clientInfo.clientClass',
        'formData.ranking': 'clientInfo.ranking',

        'formData.faculty': 'clientInfo.faculty',
        'formData.customerType': 'clientInfo.customerType',
        'formData.lineManager': 'clientInfo.lineManager',
        'formData.jobType': 'clientInfo.jobType',

      },
      resultMap: {
        'Client.id': 'id',
        'Client.customer.accountType': 'accountType',
        'Client.salesTeam': 'repCode',
        'Client.jobTitle': 'jobTitle',
        'Client.department': 'department',
        'Client.customer.customerClass': 'clientClass',
        'Client.customer.id': 'customerId',
        'Client.customer.ranking': 'ranking',

        'Client.faculty': 'faculty',
        'Client.customerType': 'customerType',
        'Client.lineManager': 'lineManager',
        'Client.lineManagerLabel': 'lineManagerLabel',
        'Client.jobType': 'jobType',
        'Client.jobTypeLabel': 'jobTypeLabel',
      },
      // onSuccessMethod: 'refresh',
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Personal details successfully updated.',
        props: {
          timeOut: 10000,
          canDismiss: true,
          components: [
            {
              componentFqn: 'core.ConditionalIconComponent@1.0.0',
              componentProps: {
                conditions: [
                  {
                    key: 'de-active',
                    icon: 'trip_origin',
                    style: {
                      color: 'red'
                    },
                    tooltip: 'Client Active'
                  },
                  {
                    key: 'active',
                    icon: 'trip_origin',
                    style: {
                      color: '#fff'
                    },
                    tooltip: 'Client Active'
                  }

                ]
              },
              style: {
                marginRight: '8px',
                marginTop: '8px',
              },
              propsMap: {
                'formData.clientStatus': 'value',
              },
            }
          ]
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
          salesTeam
          customerType
          clientDepartment
          ranking
          customerClass
          faculty
          jobType
          jobTypeLabel
          lineManager
          customerType
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'jobDetails.jobTitle': 'jobTitle',
      'jobDetails.salesTeam': 'salesTeam',
      'jobDetails.clientDepartment': 'clientDepartment',
      'jobDetails.ranking': 'ranking',
      'jobDetails.customerClass': 'customerClass',

      'jobDetails.faculty': 'faculty',
      'jobDetails.jobType': 'jobType',
      'jobDetails.jobTypeLabel': 'jobTypeLabel',
      'jobDetails.lineManager': 'lineManager',
      'jobDetails.customerType': 'customerType',

    },
    refreshEvents: [
      { name: "LasecNewClient::onResetForm" }
    ],
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
            jobTypeLabel
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
        'eventData.formData.jobTitle': 'newClient.jobDetails.jobTitle',
        'eventData.formData.jobType': 'newClient.jobDetails.jobType',
        'eventData.formData.lineManager': 'newClient.jobDetails.lineManager',
        'eventData.formData.customerType': 'newClient.jobDetails.customerType',
        'eventData.formData.clientDepartment': 'newClient.jobDetails.clientDepartment',
        'eventData.formData.ranking': 'newClient.jobDetails.ranking',
        'eventData.formData.customerClass': 'newClient.jobDetails.customerClass',
      },
      // handledBy: 'onChange',
      resultType: 'object',
      throttle: 0,
      resultMap: {
        'id': 'id',
        'jobDetails.jobTitle': 'jobTitle',
        'jobDetails.jobType': 'jobType',
        'jobDetails.jobTypeLabel': 'jobTypeLabel',
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
