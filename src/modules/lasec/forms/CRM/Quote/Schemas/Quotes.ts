import { Reactory } from '@reactory/server-core/types/reactory';

const QuoteSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    // view: {
    //   title: '',
    //   type: 'string'
    // },
    id: {
      type: "string",
      title: "Client Id"
    },
    code: {
      type: "string",
      title: "Quote Number"
    },
    date: {
      type: "string",
      title: "Quote Date"
    },
    status: {
      type: "string",
      title: "Quote Status"
    },
    total: {
      type: "string",
      title: "Quote Total"
    },

  }
};

export default QuoteSchema;
