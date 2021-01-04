import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerList',
    text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        customers {
          id
          registeredName
          country
          accountNumber
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'customers': 'customers',
    },
    autoQuery: false,
    queryMessage: 'Search for customers',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
  //   onSelectCustomer: {
  //     name: "LasecUpdateCustomerCompany",
  //     text: `mutation LasecUpdateCustomerCompany($clientId: String, $customerDetail: Any!){
  //       LasecUpdateCustomerCompany(clientId: $clientId,  customerDetail: $customerDetail) {
  //         success
  //         message
  //       }
  //     }`,
  //     objectMap: true,
  //     updateMessage: 'Updating Customer Company',
  //     variables: {
  //       'selected.id': 'clientId',
  //       // 'selected.registeredName': 'customerDetail',
  //       'eventData.formData': 'customerDetail',
  //     },
  //     onSuccessEvent: {
  //       name: 'CloseModal:LasecCRMCustomerCompanyLookupTable',
  //     }
  //   }
  }
};

export const newClientGraphQL: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCustomerList',
    text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
      LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
        paging {
          total
          page
          hasNext
          pageSize
        }
        customers {
          id
          registeredName
          tradingName
          accountNumber
          accountType
          country
          customerStatus
          currencySymbol
          currencyCode
          currencyDisplay
          registrationNumber
          taxNumber
          importVATNumber
        }
      }
    }`,
    variables: {
      'props.formContext.$formData.search': 'search',
      'props.formContext.$formData.paging': 'paging',
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'customers': 'data',
    },
    autoQuery: false,
    queryMessage: 'Search for customers',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  queries: {
    pagedQuery: {
      name: 'LasecGetCustomerList',
      text: `query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String){
        LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy){
          paging {
            total
            page
            hasNext
            pageSize
          }
          customers {
            id
            registeredName
            country
            accountNumber
          }
        }
      }`,
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
      },
      resultMap: {
        'paging': 'paging',
        'filterBy': 'filterBy',
        'customers': 'data',
      },
      autoQuery: false,
      queryMessage: 'Search for customers',
      resultType: 'object',
      edit: false,
      new: false,
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    }
  },
  mutation: {
    // onSelectCustomer: {
    //   name: "LasecUpdateCustomerCompany",
    //   text: `mutation LasecUpdateCustomerCompany($clientId: String, $customerDetail: Any!){
    //     LasecUpdateCustomerCompany(clientId: $clientId,  customerDetail: $customerDetail) {
    //       success
    //       message
    //     }
    //   }`,
    //   objectMap: true,
    //   updateMessage: 'Updating Customer Company',
    //   variables: {
    //     'selected.id': 'clientId',
    //     'clientId': 'customerDetail',
    //     // 'eventData.formData': 'customerDetail',
    //   },
    //   onSuccessEvent: {
    //     name: 'CloseModal:LasecCRMCustomerCompanyLookupTable',
    //   },
      // refreshEvents: [
      //   {
      //     name: "NewClient.onCustomerSelected"
      //   }
      // ],
      // resultMap: {
      //   'customer.id': 'id',
      //   'customer.registeredName': 'registeredName',
      // },
    // }
  },
};

export default graphql;
