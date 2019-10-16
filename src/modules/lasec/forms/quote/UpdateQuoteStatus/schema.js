


const schema = {
  type: 'object',    
  required: [
    //'customer',
    //'quoteStatus',
    'nextAction',
  ],
  properties: {
    quote_id: {
      type: 'string',
      title: 'Quote Id',
      description: 'Quote Id',
    },
    customer: {
      type: 'object',
      title: 'Customer',
      description: 'Customer for quote',
      properties: {
        id: {
          type: 'string',
          title: 'Customer Id'
        },
        fullName: {
          type: 'string',
          title: 'Customer Name'
        }
      },      
    },
    company: {
      type: 'object',
      title: 'Company',
      description: 'Company For the Quote',
      properties: {
        id: {
          type: 'string',
          title: 'Customer Id'
        },
        tradingName: {
          type: 'string',
          title: 'Company Name'
        }
      },
    },
    statusGroup: {
      type: 'string',
      title: 'Status Group',
      description: 'Status Grouping',
      default: '1',
    },   
    statusName: {
      type: 'string',
      title: 'Quote Status',
      description: 'Current Quote Status',
    },    
    nextAction: {
      type: 'string',
      title: 'Next Action',
      description: 'Next action for the quote',
    },
    reminder: {
      type: 'number',
      title: 'Follow Up',
      description: 'Reminder',
    },
    reasonCodes: {
      type: 'array',
      title: 'Reason Codes',
      items: {
        type: 'string',
      },
    },
    reason: {
      type: 'string',
      title: 'Reason',
      description: 'End of the period for which to collate quote data',
    },
    note: {
      type: 'string',
      title: 'Note (Internal)',
      description: 'Leave a small note',
    }
  }    
};


export default schema;