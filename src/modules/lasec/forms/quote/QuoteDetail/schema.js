export default {
    type: 'object',
    title: 'Quote Details',    
    properties: {
      id: {
        type: 'string',
        title: 'Quote Id',
      },
      statusName: {
        type: 'string',
        title: 'Status',
      },
      statusGroup: {
        type: 'string',
        title: 'Status Group'
      },
      companyTradingName: {
        type: 'string',
        title: 'Company',
      },
      customerName: {
        type: 'string',
        title: 'Customer',
      },
      totalVATExclusive: {
        type: 'number',
        title: 'Total Vat (Excl)',
      },
      totalVATInclusive: {
        type: 'number',
        title: 'Total Vat (Incl)',
      },
      timeline: {
        type: 'array',
        title: 'Timeline',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            who: {
              type: 'object',
              title: 'Who',
              properties: {
                id: { type: 'string', title: 'User Id' },
                firstName: { type: 'string', title: 'First Name' },
                lastName: { type: 'string', title: 'Last Name' },
                email: { type: 'string', title: 'Email' },
                avatar: { type: 'string', title: 'Avatar' },
              }
            },
            what: {
              type: 'string',
              title: 'What'
            },
            text: {
              type: 'string',
              title: 'title'
            }
          }
        }
      },
      quoteLineItems: {
        type: 'array',
        title: 'Items',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Line Entry',
            },
            title: {
              type: 'string',
              title: 'Product Title'
            },
            qty: {
              type: 'number',
              title: 'Quantity',
            },
            totalVATExclusive: {
              type: 'number',
              title: 'Total Vat (Excl)',
            },
            totalVATInclusive: {
              type: 'number',
              title: 'Total Vat (Incl)',
            },
          },
        },
      },
    },
  };