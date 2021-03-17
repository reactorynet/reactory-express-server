
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
      documents: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
    {
      comments: { xs: 12 },
    },
  ],

  header: {
    'ui:widget': 'LasecCRMISODetailHeader',
    'ui:options': {}
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
    'ui:options': {},
  },
  orderSummary: {
    'ui:widget': 'LasecCRMISODetailOrderSummary',
    'ui:options': {},
  },

  documents: {
    'ui:options': {
      componentType: 'div',
      toolbarPosition: 'none',
      containerStyles: {
        padding: '0px',
        margin: '0px',
        marginTop: '16px',
        paddingBottom: '8px',
      },

      style: {
        marginTop: '16px',
      },
      showSubmit: false,
      showRefresh: false,
    },
    'ui:titleStyle': {
      borderBottom: '2px solid #D5D5D5',
    },
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        uploadedDocuments: { lg: 6, md: 6, sm: 12 },
        upload: { lg: 6, md: 6, sm: 12, },
      },
    ],

    upload: {
      'ui:widget': 'ReactoryDropZoneWidget',
      'ui:options': {
        showLabel: false,
        style: {

        },
        ReactoryDropZoneProps: {
          text: 'Drop files here, or click to select files to upload',
          accept: ['text/html', 'text/text', 'application/xml', 'application/pdf'],
          uploadOnDrop: true,
          mutation: {
            name: 'LasecUploadDocument',
            text: `mutation LasecUploadDocument($file: Upload!, $uploadContext: String){
                      LasecUploadDocument(file: $file, uploadContext: $uploadContext) {
                          id
                          filename
                          link
                          mimetype
                          size
                      }
                  }`,
            variables: {
              uploadContext: 'lasec-crm::sales-order::document-${props.formContext.quote_id}-${props.formContext.iso_id}', // eslint-disable-line
            },
            onSuccessEvent: {
              name: 'lasec-crm::sales-order::document::uploaded',
            },
          },
          iconProps: {
            icon: 'upload',
            color: 'secondary',
          },
          labelProps: {
            style: {
              display: 'block',
              paddingTop: '95px',
              height: '200px',
              textAlign: 'center',
            },
          },
          style: {
            minHeight: '200px',
            outline: '1px dashed #E8E8E8',
          },
        },
      },
    },

    uploadedDocuments: {
      'ui:widget': 'LasecSalesOrderDocuments',
      'ui:options': {

      },
      'ui:props': {
        mode: 'existing',
      },
    },
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
