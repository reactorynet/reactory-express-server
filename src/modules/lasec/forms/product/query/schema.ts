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
