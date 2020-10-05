import { Reactory } from '@reactory/server-core/types/reactory';

const QuoteSchema: Reactory.ISchema = {
  type: "object",
  properties: {    
    id: {
      type: "string",
      title: "Quote Id"
    },
    code: {
      type: "string",
      title: "Quote Number"
    },
    created: {
      type: "string",
      title: "Quote Date"
    },

    statusName: {
      type: "string",
      title: "Quote Status",
    },

    allowed_statuses: {
      type: "array",
      title: "Allowed Statuses",
      items: {
        type: "string",
        title: 'Status'
      }
    },

    status: {
      type: "string",
      title: "Quote Status"
    },
    
    totalVATInclusive: {
      type: "number",
      title: 'Total Quote Value'
    },
    client: {
      type: "String",
      title: "Client"
    },

    companyTradingName: {
      type: "String",
      title: "Company Trading Name"
    },
    
    totalVATExclusive: {
      type: "number",
      title: 'Totla Quote Value'
    },

    quoteType: {
      type: 'string',
      title: "Quote Type"
    },

    repCode: {
      type: "string",
      title: "Quote Status"
    },

  }
};

export default QuoteSchema;
