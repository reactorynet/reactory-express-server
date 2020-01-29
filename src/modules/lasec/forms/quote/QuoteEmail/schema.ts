import { Reactory } from '@reactory/server-core/types/reactory';

// const schema: Reactory.ISchema = {
const schema: Reactory.IObjectSchema = {
  title: '',
  type: 'object',
  properties: {
    code: {
      type: 'string',
      title: 'Quote Code:',
    },
    customerName: {
      type: 'string',
      title: 'Customer Name:',
    },
    customerEmail: {
      type: 'string',
      title: 'Customer Email:',
    },
    subject: {
      type: 'string',
      title: 'Subject:',
    },
    message: {
      type: 'string',
      title: 'Message:',
    },
  }
};

export default schema;
