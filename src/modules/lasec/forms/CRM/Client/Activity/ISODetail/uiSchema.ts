
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
    'ui:widget': 'LasecCRMISODetailHeader',
    'ui:options': { }
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
    'ui:widget': 'LasecCRMISODetailDocuments',
    'ui:options': {
      propsMap: {
        'formData.orderId': 'sales_order_id'
      },
    }
  },
  lineItems: {
    'ui:widget': 'LasecCRMISODetailLineItems',
    'ui:options': { }
  },
  comments: {
    //'ui:widget': 'LasecCRMISODetailComments',
    //'ui:options': { 
    //  propsMap: {
    //    'formData.orderId': 'sales_order_id'
    //  },
    //}
  },  
};

export default uiSchema;
