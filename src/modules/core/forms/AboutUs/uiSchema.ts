
const froalaOptions = {
  // Set the load images request type.
  imageManagerLoadMethod: 'GET',
  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
};

export default {
  slug: {
    'ui:widget': 'HiddenWidget'
  },
  createdAt: {
    'ui:widget': 'DateSelectorWidget'
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  }

};
