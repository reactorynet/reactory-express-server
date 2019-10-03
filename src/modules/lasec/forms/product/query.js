
import { defaultFormProps } from '../../../../data/forms/defs';

const ProductQuerySchema = {
  title: 'Product Enquiry',
  description: 'Enquiry Form',
  type: 'object',
  required: [
    'id','subject', 'message', 'from'
  ],
  properties: {    
    id: {
      type: 'string',
      title: 'Product Code',
    },
    from: {
      type: 'string',
      title: 'From'
    },
    subject: {
      type: 'string',
      title: 'Subject',
    },
    message: {
      type: 'string',
      title: 'Message',
    },
  },
};


export default {
  id: 'ProductEnquiry',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Product Enquiry',
  icon: 'send',
  tags: ['Product', 'Product Query', 'Product Enquiry'],
  schema: ProductQuerySchema,
  widgetMap: [

  ],
  components: [],
  registerAsComponent: true,
  name: 'Product Enquiry',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        id: { md: 6, sm: 12, xs: 12 },
        from: { md: 6, sm: 12, xs: 12 },
        subject: { md: 12, sm: 12, xs: 12 },
        message: { md: 12, sm: 12, xs: 12 }
      },
    ],    
  },
};
