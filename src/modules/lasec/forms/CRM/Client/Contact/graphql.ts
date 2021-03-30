import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        emailAddress
        alternateEmail
        mobileNumber
        officeNumber
        alternateOfficeNumber
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'emailAddress': 'emailAddress',
      'alternateEmail': 'alternateEmail',
      'officeNumber': 'officeNumber',
      'mobileNumber': 'mobileNumber',
      'alternateOfficeNumber': 'alternateNumber',
    },
    autoQuery: true,
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
        'formData.mobileNumber': 'clientInfo.mobileNumber',
        'formData.alternateNumber': 'clientInfo.alternateOfficeNumber',
        'formData.officeNumber': 'clientInfo.officeNumber',
        'formData.emailAddress': 'clientInfo.email',
        'formData.alternateEmail': 'clientInfo.alternateEmail',
      },
      // onSuccessMethod: 'refresh',
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Contat details successfully updated.',
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
        contactDetails {
          emailAddress
          confirmEmail
          alternateEmail
          confirmAlternateEmail
          mobileNumber
          alternateMobile
          officeNumber
          alternateOfficeNumber
          prefferedMethodOfContact
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'contactDetails.emailAddress': 'emailAddress',
      'contactDetails.confirmEmail': 'confirmEmail',
      'contactDetails.alternateEmail': 'alternateEmail',
      'contactDetails.confirmAlternateEmail': 'confirmAlternateEmail',
      'contactDetails.mobileNumber': 'mobileNumber',
      'contactDetails.officeNumber': 'officeNumber',
      'contactDetails.prefferedMethodOfContact': 'prefferedMethodOfContact'
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
          contactDetails {
            emailAddress
            confirmEmail
            alternateEmail
            confirmAlternateEmail
            mobileNumber
            alternateMobile
            officeNumber
            prefferedMethodOfContact
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Personal Content',
      variables: {
        'eventData.formData.id': 'clientId',
        'eventData.formData.emailAddress': 'newClient.contactDetails.emailAddress',
        'eventData.formData.confirmEmail': 'newClient.contactDetails.confirmEmail',
        'eventData.formData.alternateEmail': 'newClient.contactDetails.alternateEmail',
        'eventData.formData.confirmAlternateEmail': 'newClient.contactDetails.confirmAlternateEmail',
        'eventData.formData.mobileNumber': 'newClient.contactDetails.mobileNumber',
        'eventData.formData.alternateMobile': 'newClient.contactDetails.alternateMobile',
        'eventData.formData.officeNumber': 'newClient.contactDetails.officeNumber',
        'eventData.formData.prefferedMethodOfContact': 'newClient.contactDetails.prefferedMethodOfContact',
      },
      // handledBy: 'onChange',
      throttle: 0,
      resultType: 'object',
      resultMap: {
        'id': 'id',
        'contactDetails.emailAddress': 'emailAddress',
        'contactDetails.confirmEmail': 'confirmEmail',
        'contactDetails.alternateEmail': 'alternateEmail',
        'contactDetails.confirmAlternateEmail': 'confirmAlternateEmail',
        'contactDetails.mobileNumber': 'mobileNumber',
        'contactDetails.officeNumber': 'officeNumber',
        'contactDetails.prefferedMethodOfContact': 'prefferedMethodOfContact'
      },
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    }
  },
};

export default graphql;
