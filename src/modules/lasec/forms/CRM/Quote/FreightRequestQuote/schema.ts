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
      type: 'string',
    },
  }
};

export default schema;
