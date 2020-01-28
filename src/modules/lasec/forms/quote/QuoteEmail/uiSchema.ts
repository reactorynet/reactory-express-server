
const uiSchema: any = {
  message: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions: {
        toolbarInline: true,
        fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file?storage=azure',
        videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video?storage=azure',
        imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image?storage=azure',
        requestHeaders: {
          'x-client-key': '${formContext.api.CLIENT_KEY}',
          'x-client-pwd': '${formContext.api.CLIENT_PWD}',
        },
      },
    },
  },
};

export default uiSchema;
