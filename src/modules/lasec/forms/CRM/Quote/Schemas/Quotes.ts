import { Reactory } from '@reactory/server-core/types/reactory';

const QuoteSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    id: {
      type: "string",
      title: "Client Id"
    },
    code: {
      type: "string",
      title: "Quote Number"
    },

  }
};

export default QuoteSchema;
