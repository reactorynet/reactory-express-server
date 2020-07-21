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
})