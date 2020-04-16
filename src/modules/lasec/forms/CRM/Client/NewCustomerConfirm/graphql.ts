import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetNewClient',
    text: `query LasecGetNewClient {
      LasecGetNewClient {
        id
        confirmed
        saved
        createdBy {
          id
          firstName
          lastName
        }
        personalDetails {
          title
          firstName
          lastName
          country
          repCode
        }
        contactDetails {
          emailAddess
          confirmEmail
          alternateEmail
          confirmAlternateEmail
          mobileNumber
          alternateMobile
          officeNumber
          prefferedMethodOfContact
        }
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
        cutomer {
          id
          registeredName
          tradingName
        }
        organization {
          id
          name
          description
        }
        address {
          physicalAddress {
            id
            fullAddress
          }
          deliveryAddress {
            id
            fullAddress
          }
          billingAddress {
            id
            fullAddress
          }
        }
        clientDocuments {
          id
          filename
          link
          mimetype
          size
        }          
      }
    }`,
    variables: {      
      'formData.$uploadContexts': 'uploadContexts'            
    },
    formData: {
      $uploadContext: [
        'lasec-crm::new-company::document',
        'lasec-crm::company-document'
      ]
    },    
    autoQuery: true,
    queryMessage: 'Loading customer documents',
    resultType: 'object',
    edit: false,
    new: false,
    refreshEvents: [
      { name: 'lasec-crm::new-document::uploaded' }
    ],
  },
  mutation: {
    new: {
      name: 'LasecUploadDocument',
      text: `mutation LasecUploadDocument($file: Upload!){
        LasecUploadDocument(file: $file) {
          id
          name
          url
          mimetype
        }
      }`,
      notification: {

      },
      variables: {

      },
      objectMap: true,

    },
    onChange: {
      name: '',
      text: `mutation LasecUpdateNewClient(newClient: LasecNewClientInput) {
        
      }`,
      variables: {

      },
      objectMap: true
    }    
  }
};

export default graphql;
