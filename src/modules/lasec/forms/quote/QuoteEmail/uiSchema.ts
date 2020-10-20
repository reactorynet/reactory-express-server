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
      email_type: { sm: 12, md: 4, lg: 2 },
      quote_id: { sm: 12, md: 4, lg: 2 }
    },
    
    {
      to: { sm: 12, md: 4, lg: 3 },
      cc: { sm: 12, md: 4, lg: 3 },
      bcc: { sm: 12, md: 4, lg: 3 },
      attachments: { sm: 12,  md: 4, lg: 3 },
    },

    {
      subject: { sm: 12 },
      message: { sm: 12 },
    },

  ],

  quote_id: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      variant: 'subtitle1',
      title: 'Quote ID',
      format: '${formData}',
    }
  },

  to: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      labelFormat: '${item.display}<${item.email}>',
      addComponentFqn: 'core.AddEmailAddressForm',
      onAddHandler: 'onSubmit',
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
      addComponentFqn: 'core.AddEmailAddressForm',
      onAddHandler: 'onSubmit',
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
      addComponentFqn: 'core.AddEmailAddressForm',
      onAddHandler: 'onSubmit',
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

    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      labelFormat: '${item.filename}',
      addComponentFqn: 'lasec-crm.QuoteEmailAttachmentWidget',
      addComponentProps: {
        email_type: '${props.formContext.$formData.email_type}',
        quote_id: '${props.formContext.$formData.quote_id}',
        user_id: '${props.api.$user.id}'
      },      
      onAddHandler: 'onSubmit',
      container: 'core.BasicContainer',
      containerProps: {
        title: 'Attachments',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },

    /*
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      id: 'Id',      
      primaryText: '${item.displayName} ${item.filename}',
      secondaryText: '${item.url}',
      variant: 'button',
      secondaryAction: {
        iconKey: 'trash',
        label: 'Remove',        
        action: 'event:onDelete',        
      }
    }
    */
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
    'ui:widget': 'QuoteEmailTypeSelector',    
  }
};

export default uiSchema;
