
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      backgroundColor: '#F6F6F6',
      border: 'none',
      boxShadow: 'none',
      padding: 0,
      margin: 0,
      paddingBottom: 0
    },
    style: {
      backgroundColor: '#F6F6F6',
      border: 'none',
      boxShadow: 'none',
      marginTop: 0,
      marginRight: 0,
      marginLeft: 0,
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
  },
  'ui:grid-layout': [
    {
      header: { xs: 12 },
    },
    {
      deliveryDetails: { xs: 12 },
    },
    {
      orderSummary: { xs: 12 },
    },
    {
      documents: { xs: 12 },
    },
    {
      lineItems: { xs: 12 },
    },
    {
      comments: { xs: 12 },
    },
  ],

  header: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecCRMISODetailHeader@1.0.0',
      componentPropsMap: {
        'formContext.$formData.orderDate': 'formData.orderDate',
        'formContext.$formData.customer': 'formData.customer',
        'formContext.$formData.client': 'formData.client',
        'formContext.$formData.currency': 'formData.currency',
      }
    }
  },
  deliveryDetails: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecCRMISODetailDeliveryDetails@1.0.0',
      componentPropsMap: {
        'formContext.$formData.deliveryAddress': 'formData.deliveryAddress',
        'formContext.$formData.deliveryNote': 'formData.deliveryNote',
        'formContext.$formData.warehouseNote': 'formData.warehouseNote',
      }
    }
  },
  orderSummary: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecCRMISODetailOrderSummary@1.0.0',
      componentPropsMap: {
        'formContext.$formData.id': 'formData.id',
        'formContext.$formData.orderId': 'formData.orderId',
        'formContext.$formData.orderType': 'formData.orderType',
        'formContext.$formData.poNumber': 'formData.poNumber',
        'formContext.$formData.salesTeam': 'formData.salesPerson',
        'formContext.$formData.quoteId': 'formData.quoteNumber',
      }
    }
  },
  documents: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecCRMISODetailDocuments@1.0.0',
      componentPropsMap: {
        'formContext.$formData.orderId': 'formData.orderId',
        'formContext.$formData.documentIds': 'formData.documentIds',
      }
    }
  },
  lineItems: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecCRMISODetailLineItems@1.0.0',
      componentPropsMap: {
        'formContext.$formData.lineItems': 'formData.lineItems',
      }
    }
  },
  comments: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecCRMISODetailComments@1.0.0',
      componentPropsMap: {
        'formContext.$formData.orderId': 'formData.orderId',
        // 'formContext.$formData.comments': 'formData.comments',
      }
    }
  },

  // orderStatus: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: '${formData}',
  //     variant: 'subtitle1',
  //     title: 'Order Status',
  //     titleProps: {
  //       style: {
  //         display: 'content',
  //         minWidth: '130px',
  //         color: "#9A9A9A",
  //       }
  //     },
  //     bodyProps: {
  //       style: {
  //         display: 'flex',
  //         justifyContent: 'flex-end'
  //       }
  //     }
  //   },
  // },
};

export default uiSchema;
