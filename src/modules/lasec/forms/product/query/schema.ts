import { Reactory } from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: 'object',
  required: [
    'subject', 'message'
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
    to: {
      type: 'string',
      title: 'Buyer'
    },
    toEmail: {
      type: 'string',
      title: 'Buyer Email'
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
