import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        customer {
          id
          customerStatus
          registeredName
          tradingName
          currencyDisplay
          description
          physicalAddressId
          physicalAddress
          deliveryAddressId
          deliveryAddress
          billingAddressId
          billingAddress
          registrationNumber
          taxNumber
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'customer.customerStatus': 'customerStatus',
      'customer.registeredName': 'registeredCompanyName',
      'customer.tradingName': 'tradingName',
      'customer.currencyDisplay': 'tradingCurrency',
      'customer.description': 'description',
      'customer.physicalAddress': 'physicalAddress',
      'customer.deliveryAddress': 'deliveryAddress',
      'customer.billingAddress': 'billingAddress',
      'customer.registrationNumber': 'registrationNumber',
      'customer.taxNumber': 'taxNumber'
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    // edit: {
    //   name: "LasecUpdateClientDetails",
    //   text: `mutation LasecUpdateClientDetails($clientInfo: ClientUpdateInput!){
    //     LasecUpdateClientDetails(clientInfo: $clientInfo) {
    //       Success
    //     }
    //   }`,
    //   objectMap: true,
    //   updateMessage: 'Updating Template Content',
    //   variables: {
    //     'formData.id': 'clientInfo.clientId',
    //     'formData.registeredCompanyName': 'clientInfo.customerCompanyName',
    //     'formData.tradingName': 'clientInfo.customerTradingName',
    //     'formData.tradingCurrency': 'clientInfo.customerTradingCurrency',
    //     'formData.description': 'clientInfo.customerDescription',
    //     'formData.registrationNumber': 'clientInfo.customerRegistrationNumber',
    //     'formData.taxNumber': 'clientInfo.customerTaxNumber',
    //   },
    //   onError: {
    //     componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
    //     method: 'onGraphQLQueryError',
    //   },
    //   onSuccessMethod: 'notification',
    //   notification: {
    //     inAppNotification: true,
    //     title: 'Personal details successfully updated.',
    //     props: {
    //       timeOut: 10000,
    //       canDismiss: false,
    //       components: [
    //         {
    //           componentFqn: 'core.ConditionalIconComponent@1.0.0',
    //           componentProps: {
    //             conditions: [
    //               {
    //                 key: 'de-active',
    //                 icon: 'trip_origin',
    //                 style: {
    //                   color: 'red'
    //                 },
    //                 tooltip: 'Client Active'
    //               },
    //               {
    //                 key: 'active',
    //                 icon: 'trip_origin',
    //                 style: {
    //                   color: '#fff'
    //                 },
    //                 tooltip: 'Client Active'
    //               }

    //             ]
    //           },
    //           style: {
    //             marginRight: '8px',
    //             marginTop: '8px',
    //           },
    //           propsMap: {
    //             'formData.clientStatus': 'value',
    //           },
    //         }
    //       ]
    //     }
    //   },
    // },
    edit: {
      name: "LasecUpdateCustomerCompany",
      text: `mutation LasecUpdateCustomerCompany($clientId: String, $customerDetail: Any!){
        LasecUpdateCustomerCompany(clientId: $clientId,  customerDetail: $customerDetail) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {
        'formData.id': 'clientId',
        'eventData.formData': 'customerDetail',
      },
      resultType: 'object',
      // resultMap: {
      //   'customer.id': 'id',
      //   'customer.registeredName': 'registeredName',
      // },
    },
    new: {
      name: "LasecUpdateCustomerCompany",
      text: `mutation LasecUpdateCustomerCompany($clientId: String, $customerDetail: Any!){
        LasecUpdateCustomerCompany(clientId: $clientId,  customerDetail: $customerDetail) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {
        'formData.id': 'clientId',
        'eventData.formData': 'customerDetail',
      },
      resultType: 'object',
      // resultMap: {
      //   'customer.id': 'id',
      //   'customer.registeredName': 'registeredName',
      // },
    },
    onCustomerSelect: {
      name: "LasecUpdateCustomerCompany",
      text: `mutation LasecUpdateCustomerCompany($clientId: String, $customerDetail: Any!){
        LasecUpdateCustomerCompany(clientId: $clientId,  customerDetail: $customerDetail) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating client customer selection',
      variables: {
        'formData.id': 'clientId',
        'eventData.formData': 'customerDetail',
      },
      resultType: 'object',
      // resultMap: {
      //   'customer.id': 'id',
      //   'customer.registeredName': 'registeredName',
      // },
    }
  },
};

export default graphql;
