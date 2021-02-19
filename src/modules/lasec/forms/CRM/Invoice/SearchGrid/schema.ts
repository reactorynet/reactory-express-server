import { Reactory } from '@reactory/server-core/types/reactory'; //eslint-disable-line

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    invoices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
        },
      },
    },
  },
};

export default schema;
