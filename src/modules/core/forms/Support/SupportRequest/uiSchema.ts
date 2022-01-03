const froalaOptions = {
  imageManagerLoadMethod: 'GET',
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
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
    'ui:options': {
      froalaOptions,
    },
  },  
}