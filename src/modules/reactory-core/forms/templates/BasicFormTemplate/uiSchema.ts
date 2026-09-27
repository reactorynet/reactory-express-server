/**
 * Default Froala options
 */
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
    'x-client-public-key': '${formContext.reactory.CLIENT_PUBLIC_KEY}',
  },
};


export const argsUiSchema = {

}


export default {
  'ui:options': {},
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      BooleanProperty: { xs: 12, lg: 12 },
      StringProperty: { xs: 12, lg: 12 },      
    }
  ],
  BooleanProperty: {},
  StringProperty: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions,
    },
  },  
}