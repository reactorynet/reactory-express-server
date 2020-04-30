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
          accountType
          firstName
          lastName
          country
          repCode
        }
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
        customer {
          id
          registeredName          
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
    resultType: 'object',
    resultMap: {
      'id': 'id',
      'personalDetails': 'personalDetails',      
      'personalDetails.title': 'personalDetails.clientTitle',      
      'contactDetails': 'contactDetails',
      'jobDetails': 'jobDetails',
      'customer': 'customer',
      'organization': 'organization',
      'address': 'address',
      'clientDocuments': 'uploadedDocuments'
    },
    edit: false,
    new: false,
    refreshEvents: [
      { name: 'lasec-crm::new-document::uploaded' }
    ],
  },
  mutation: {
    new: {
      name: "LasecUpdateNewClient",
      text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
        LasecUpdateNewClient(newClient: $newClient) {
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
            emailAddress
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
          customer {
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
              map
            }
            deliveryAddress {
              id
              fullAddress
              map
            }
            billingAddress {
              id
              fullAddress
              map
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
      objectMap: true,
      updateMessage: 'Updating Personal Content',
      variables: {    
        'formData': 'newClient',
        'persist': true
      },
      resultType: 'object',
      resultMap: {
        'id': 'id',
        'personalDetails': 'personalDetails',
        'contactDetails': 'contactDetails',
        'jobDetails': 'jobDetails',
        'customer': 'customer',
        'organization': 'organization',
        'address': 'address'
      },
    }
  },
  queries: {
    PagedNewCustomerDocuments: {
      name: 'LasecGetCustomerDocuments',
      text: `query LasecGetCustomerDocuments($uploadContexts: [String], $paging: PagingRequest){
        LasecGetCustomerDocuments(uploadContexts: $uploadContexts, paging: $paging){
          paging {
            total
            page
            pageSize          
          }
          documents {
            id
            filename
            link
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
        {name: 'lasec-crm::new-document::uploaded'}
      ],
    }
  },
};

export default graphql;
