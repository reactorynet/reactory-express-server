export const LasecValidateCustomerEmailAddressQuery = `
query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int) {
  LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, iter: $iter) {
    search
    filterBy
    paging {
      total
      hasNext
      pageSize
    }
    clients {
      id
      emailAddress
      alternateEmail
      accountType
      firstName
      lastName
      fullName
      mobileNumber
      officeNumber      
    }
  }
}
`;

export const LasecValidateCustomerEmailAddressVariables = (email: string) => ({
  "search": email,
  "paging": {
    "page": 1,
    "pageSize": 10
  },
  "filterBy": "email",
  "iter": 0
});

export const LasecCreateNewClientMutation = `
mutation LasecCreateNewClient($newClient: LasecNewClientInput!){
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
}`;


export const LasecGetNewClientQuery = `
query LasecGetNewClient {
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
}
`;
