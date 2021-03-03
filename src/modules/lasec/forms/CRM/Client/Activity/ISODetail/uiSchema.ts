
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
      lineItems: { xs: 12 },
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
      comments: { xs: 12 },
    },
  ],

  header: {
    'ui:widget': 'LasecCRMISODetailHeader',
    'ui:options': { }
  },
  lineItems: {
    'ui:widget': 'LasecCRMISODetailLineItems',
    'ui:options': {
      propsMap: {
        'formData': 'formData.$SalesOrder',
        'formData.orderId': 'sales_order_id'
      }
    }
  },
  deliveryDetails: {
    'ui:widget': 'LasecCRMISODetailDeliveryDetails',
    'ui:options': { }
  },
  orderSummary: {
    'ui:widget': 'LasecCRMISODetailOrderSummary',
    'ui:options': { }
  },
  documents: {
    'ui:widget': 'LasecSalesOrderDocuments',
    'ui:options': {
      componentProps: {
        use_case: 'existing',
      },
      propsMap: {
        'formData.orderSummary.orderId': 'sales_order_id'
      },
    }
  },
  comments: {
    'ui:widget': 'LasecCRMISODetailComments',
    'ui:options': {
      propsMap: {
        'formData.orderSummary.orderId': 'orderId',
        'formData.new_comment': 'formData.new_comment',
        'formData.comments': 'formData.comments',
      },
    },
  },
};

export default uiSchema;
