import { Reactory } from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  title: 'Product Query',
  description: 'Enquiry Form',
  type: 'object',
  required: [
    'id','subject', 'message', 'from'
  ],
  properties: {
    code: {
      type: 'string',
      title: 'Product Code',
    },
    name: {
      type: 'string',
      title: 'Product Name',
    },
    description: {
      type: 'string',
      title: 'Product Description',
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

export default schema;
