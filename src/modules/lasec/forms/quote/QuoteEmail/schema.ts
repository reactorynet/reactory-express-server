import { Reactory } from '@reactory/server-core/types/reactory';

// const schema: Reactory.ISchema = {
const schema: Reactory.IObjectSchema = {
  title: 'Quote Email',
  description: 'Use this form to send customers an email regarding this quote.',
  type: 'object',
  properties: {
    message: {
      type: 'string',
      title: 'Email content',
      description: 'Email content',
    },
  }
};

export default schema;
