
const froalaOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
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
  submitIcon: 'send',
  'ui:options': {
    showRefresh: false  
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      code: { md: 6, sm: 6, xs: 12 },
      name: { md: 6, sm: 6, xs: 12 },
      to: { md: 6, sm: 6, xs: 12 },
      from: { md: 6, sm: 6, xs: 12 },
      subject: { md: 12, sm: 6, xs: 12 },
      message: { md: 12, sm: 12, xs: 12 }
    },
  ],

  code: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Product Code',
    }
  },
  name: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Product Name',
    }
  },
  from: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'From',
    }
  },
  to: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'To',
    }
  },
  message: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  },
};

export default uiSchema;
