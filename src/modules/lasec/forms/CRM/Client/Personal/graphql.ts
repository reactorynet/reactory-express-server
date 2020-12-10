import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        clientStatus
        title
        titleLabel
        firstName
        lastName
        fullName
        emailAddress
        country
        customer {
          id
          tradingName
          accountNumber
          customerStatus
          country
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'clientStatus': 'clientStatus',
      'title': 'title',
      'titleLabel': 'titleLabel',
      'clientTitle': 'clientTitle',
      'fullName': 'fullName',
      'customer.customerStatus': 'customerStatus',
      'customer.accountNumber': 'accountNumber',
      'customer.tradingName': 'customer',
      'country': 'country',
      'firstName': 'firstName',
      'lastName': 'lastName',
    },
    autoQuery: true,
    autoQueryDelay: 1000,
    queryMessage: 'Loading customer details',
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
        'formData.clientStatus': 'clientInfo.clientStatus',
        'formData.title': 'clientInfo.title',
        'formData.firstName': 'clientInfo.firstName',
        'formData.lastName': 'clientInfo.lastName',
        'formData.country': 'clientInfo.country',
      },
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Personal details successfully updated.',
        props: {
          timeOut: 10000,
          canDismiss: false,
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
    }
  },
};


export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient($id: String) {
      LasecGetNewClient(id: $id) {
        id
        personalDetails {
          title
          accountType
          firstName
          lastName
          country
          repCode
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
      // 'formContext.formData.id': 'id',
      // 'props.formContext.$formData.id': 'id',
      // 'formContext.$ref.props.formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'personalDetails.title': 'clientTitle',
      'personalDetails.firstName': 'firstName',
      'personalDetails.lastName': 'lastName',
      'personalDetails.country': 'country',
      'personalDetails.accountType': 'accountType',
      'personalDetails.repCode': 'repCode',
    },
    //interval: 1500,
    autoQuery: true,
    autoQueryDelay: 1000,
    refreshEvents: [
      { name: "LasecNewClient::onResetForm" }
    ],
    queryMessage: 'Loading new customer details',
    resultType: 'object',
    edit: false,
    new: true,
  },
  mutation: {

    onChange: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($clientId: String, $newClient: LasecNewClientInput!){
        LasecUpdateNewClient(clientId: $clientId, newClient: $newClient) {
          id
          personalDetails {
            title
            accountType
            firstName
            lastName
            country
            repCode
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Personal Content',
      variables: {
        'eventData.formData.id': 'clientId',
        'eventData.formData.firstName': 'newClient.personalDetails.firstName',
        'eventData.formData.lastName': 'newClient.personalDetails.lastName',
        'eventData.formData.country': 'newClient.personalDetails.country',
        'eventData.formData.repCode': 'newClient.personalDetails.repCode',
        'eventData.formData.accountType': 'newClient.personalDetails.accountType',
        'eventData.formData.clientTitle': 'newClient.personalDetails.title'
      },
      resultType: 'object',
      resultMap: {
        'id': 'id',
        'personalDetails.title': 'clientTitle',
        'personalDetails.firstName': 'firstName',
        'personalDetails.lastName': 'lastName',
        'personalDetails.country': 'country',
        'personalDetails.accountType': 'accountType',
        'personalDetails.repCode': 'repCode',
      },
      throttle: 1000,
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    }
  },
};


export default graphql;
