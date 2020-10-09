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
    },
    edit: false,
    new: true,
    refreshEvents: [
      { name: 'lasec-crm::new-document::uploaded' }
    ],
  },
  mutation: {
    new: {
      name: "LasecCreateNewClient",
      text: `mutation LasecCreateNewClient($newClient: LasecNewClientInput!){
        LasecCreateNewClient(newClient: $newClient) {
          client {
            id
            clientStatus
            firstName
            lastName
            fullName
            emailAddress
          }
          success
          messages {
            description
            text
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Creating New Client, Please Wait.',
      variables: {
        'formData.id': 'newClient.id',
        'formData.personalDetails': 'newClient.personalDetails',
        'formData.personalDetails.title': 'newClient.personalDetails.clientTitle',
        'formData.contactDetails': 'newClient.contactDetails',
        'formData.jobDetails': 'newClient.jobDetails',
        'formData.customer': 'newClient.customer',
        'formData.organization': 'newClient.organization',
        'formData.address': 'newClient.address',
      },
      resultType: 'object',
      resultMap: {
        'client': 'client',
        'success': 'success',
        'saved': 'saved'
      },
      onSuccessMethod: "event:LasecNewCustomerCreated",
      notification: {
        title: 'Created New Customer',
        inAppNotification: 'true',
        props: {
          canDismiss: true
        }
      }
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
        'formData.id': 'id',
        'formData.uploadContext': 'uploadContexts'
      },
      formData: {
        uploadContext: [
          'lasec-crm::new-company::document',
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
