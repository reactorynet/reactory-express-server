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
        'formData.alternateNumber': 'clientInfo.alternateNumber',
        'formData.emailAddress': 'clientInfo.email',
        'formData.alternateEmail': 'clientInfo.alternateEmail',
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
    variables: {    
      
    },
    resultMap: {
      'id': 'id',
      'contactDetails.emailAddress': 'emailAddress',      
      'contactDetails.confirmEmail': 'confirmEmail',
      'contactDetails.alternateEmail': 'alternateEmail',
      'contactDetails.confirmAlternateEmail': 'confirmAlternateEmail',
      'contactDetails.mobileNumber': 'mobileNumber',
      'contactDetails.officeNumber': 'officeNumber',                        
      'contactDetails.prefferedMethodOfContact':'prefferedMethodOfContact'
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
        'eventData.formData': 'newClient.contactDetails',
      },
      // handledBy: 'onChange',
      resultType: 'object',
      resultMap: {
        'id': 'id',
        'contactDetails.emailAddress': 'emailAddress',      
        'contactDetails.confirmEmail': 'confirmEmail',
        'contactDetails.alternateEmail': 'alternateEmail',
        'contactDetails.confirmAlternateEmail': 'confirmAlternateEmail',
        'contactDetails.mobileNumber': 'mobileNumber',
        'contactDetails.officeNumber': 'officeNumber',                        
        'contactDetails.prefferedMethodOfContact':'prefferedMethodOfContact'           
      },
    }
  },  
};

export default graphql;
