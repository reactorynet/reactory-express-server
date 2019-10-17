
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

export default {
  slug: {
    //TODO - add fancy check slug on change widget with query
    //'ui:widget': 'HiddenWidget'
  },
  createdAt: {
   'ui:widget': 'DateSelectorWidget'
  },
  content: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  },
  topics: {
   'ui:widget': 'ChipArrayWidget',
      'ui:options': {
        container: 'core.BasicContainer',
        containerProps: {
          title: 'Page Tags',
          style: {
            maxWidth: '100%',
            justifyContent: 'flex-end',
          },
        },
      },
  }
};
