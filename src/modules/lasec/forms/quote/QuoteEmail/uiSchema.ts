const froalaOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  // Set the load images request type.
  imageManagerLoadMethod: 'GET',
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
  },
};

const uiSchema: any = {

  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      code: { md: 6, sm: 12 },
    },
    {
      customerName: { md: 6, sm: 12 },
      customerEmail: { md: 6, sm: 12 },
    },
    {
      subject: { sm: 12 },
      message: { sm: 12 },
    },
    {
      email_type: { sm: 12 }
    }
  ],

  code: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      variant: 'subtitle1',
      title: 'Quote Code',
      format: '${formData}',
    }
  },
  customerName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      variant: 'subtitle1',
      title: 'Customer Name',
      format: '${formData}',
    }
  },
  customerEmail: {},
  subject: {},
  message: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  },
  email_type: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'send_quote', value: 'send_quote', label: 'Send Quote' },
        { key: 'status_update', value: 'send_status_update', label: 'Send Status Update' },
        { key: 'delivery_schedule', value: 'send_delivery_schedule', label: 'Send Delivery Schedule' },
      ],
    }
  }
};

export default uiSchema;
