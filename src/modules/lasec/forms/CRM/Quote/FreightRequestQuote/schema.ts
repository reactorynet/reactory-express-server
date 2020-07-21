import { Reactory } from '@reactory/server-core/types/reactory';

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    code: {
      type: "string",
      title: "Code"
    },
    email: {
      type: "string",
      title: "Email Address"
    },
    communicationMethod: {
      type: "string",
      title: "How would you like to send Quote Options?"
    },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          transportMode: {
            type: 'string'
          },
        },
      },
    },
    productDetails: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string'
          },
        },
      },
    },
  }
};

export default schema;
