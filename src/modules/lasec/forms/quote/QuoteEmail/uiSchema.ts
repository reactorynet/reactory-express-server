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
  'ui:options': {
    submitIcon: 'send' 
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      email_type: { sm: 12 }
    },
    {
      code: { md: 6, sm: 12 },
    },
    {
      to: { md: 6, sm: 12 },
      cc: { md: 6, sm: 12 },
      bcc: { md: 6, sm: 12 },
      attachments: { 6: 12, sm: 12 },
    },
    {
      subject: { sm: 12 },
      message: { sm: 12 },
    },        
  ],

  code: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      variant: 'subtitle1',
      title: 'Quote Code',
      format: '${formData}',
    }
  },

  to: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      labelFormat: '${item.display}<${item.email}>',
      addComponent: 'core.EmailAddressForm',
      onAddHandler: 'onAdded',
      textChangeParser: 'core.EmailAddressTextParser',
      container: 'core.BasicContainer',
      containerProps: {
        title: 'To',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },
  },

  cc: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      labelFormat: '${item.display}<${item.email}>',
      addComponent: 'core.EmailAddressForm',
      onAddHandler: 'onAdded',
      textChangeParser: 'core.EmailAddressTextParser',
      container: 'core.BasicContainer',
      containerProps: {
        title: 'CC',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },
  },

  bcc: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      labelFormat: '${item.display}<${item.email}>',
      addComponent: 'core.EmailAddressForm',
      onAddHandler: 'onAdded',
      textChangeParser: 'core.EmailAddressTextParser',
      container: 'core.BasicContainer',
      containerProps: {
        title: 'BCC',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },
  },

  attachments: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'Id',      
      primaryText: '${item.name}',
      secondaryText: '${item.url}',
      variant: 'button',
      secondaryAction: {
        iconKey: 'trash',
        label: 'Remove',        
        action: 'event:onDelete',        
      }
    }
  },

  subject: {
    
  },

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
