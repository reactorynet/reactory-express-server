const froalaOptions = {
  imageManagerLoadMethod: 'GET',
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
};


export default {
  'ui:options': {},
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      request: { xs: 12, lg: 12 },
      description: { xs: 12, lg: 12 },      
    }
  ],
  request: {},
  description: {
    'ui:widget': 'FroalaWidget',
    'ui:title': null,
    'ui:options': {
      showLabel: false,
      froalaOptions,
    },
  },  
}