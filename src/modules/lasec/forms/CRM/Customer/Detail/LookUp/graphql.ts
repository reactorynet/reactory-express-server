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

          description
          bankName
          bankAccountNumber
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
    onSelectCustomer: {
      name: "LasecUpdateClientDetails",
      text: `mutation LasecUpdateClientDetails($clientInfo: ClientUpdateInput!){
        LasecUpdateClientDetails(clientInfo: $clientInfo) {
          Success
          Client {
            id
            jobTitle
            salesTeam
            department

            faculty
            customerType
            lineManager
            lineManagerLabel
            jobType
            jobTypeLabel

            customer {
              id
              accountType
              customerClass
              ranking
            }
          }
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.id': 'clientInfo.clientId',
        'selected': 'clientInfo.customer',

      },
      resultMap: {
        'Client.id': 'id',
        'Client.customer.accountType': 'accountType',
        'Client.salesTeam': 'repCode',
        'Client.jobTitle': 'jobTitle',
        'Client.department': 'department',
        'Client.customer.customerClass': 'clientClass',
        'Client.customer.id': 'customerId',
        'Client.customer.ranking': 'ranking',

        'Client.faculty': 'faculty',
        'Client.customerType': 'customerType',
        'Client.lineManager': 'lineManager',
        'Client.lineManagerLabel': 'lineManagerLabel',
        'Client.jobType': 'jobType',
        'Client.jobTypeLabel': 'jobTypeLabel',
      },
      // onSuccessMethod: 'refresh',
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Personal details successfully updated.',
        props: {
          timeOut: 10000,
          canDismiss: true,
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
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    }

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
    //   refreshEvents: [
    //     {
    //       name: "NewClient.onCustomerSelected"
    //     }
    //   ],
    //   resultMap: {
    //     'customer.id': 'id',
    //     'customer.registeredName': 'registeredName',
    //   },
    // }
  },
};

export default graphql;
