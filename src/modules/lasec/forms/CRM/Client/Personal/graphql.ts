import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        clientStatus
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
      'fullName': 'fullName',
      'customer.customerStatus': 'customerStatus',
      'customer.accountNumber': 'accountNumber',
      'customer.tradingName': 'customer',
      'country': 'country',
      'firstName': 'firstName',
      'lastName': 'lastName',
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
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
        'formData.clientStatus': 'clientInfo.clientStatus',
        'formData.firstName': 'clientInfo.firstName',
        'formData.lastName': 'clientInfo.lastName',
        'formData.country': 'clientInfo.country',
      },
      // onSuccessMethod: 'refresh'
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
    text: `query LasecGetNewClient {
      LasecGetNewClient {
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
    queryMessage: 'Loading new customer details',
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
        'eventData.formData': 'newClient.personalDetails',
        'eventData.formData.clientTitle': 'newClient.personalDetails.title'    
      },
      // handledBy: 'onChange',
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
    }
  },  
};


export default graphql;
