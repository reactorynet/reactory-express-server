import { defaultFormProps } from '../../defs';

export { default as ProductCategories } from './categories';


export const ProductQuestions = {
  type: 'object',
  title: 'Rotor Configuration',
  description: '',
  required: [
  ],
  properties: {
    customer: {
      type: 'string',
      title: 'Rotor Type',
      description: 'Customer for quote',
    },
  },
};


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

export const UpdateQuoteStatusForm = {
  id: 'Sales',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Sales',
  tags: ['Product'],
  schema: ProductQuestions,
  widgetMap: [
    /*
    {
      component: 'core.InboxComponent@1.0.0',
      widget: 'InboxComponent',
    },
    */
  ],
  components: [],
  registerAsComponent: true,
  name: 'ProductListForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        customer: { md: 6, sm: 12, xs: 12 },
      },
    ],
  },
};
