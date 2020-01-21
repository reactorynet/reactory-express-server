export default {
  type: 'object',
  title: 'Quote Details',
  properties: {
    id: {
      type: 'string',
      title: 'Quote Id',
    },
    companyTradingName: {
      type: 'string',
      title: 'Company',
    },
    customerName: {
      type: 'string',
      title: 'Customer',
    },
    created: {
      type: 'string',
      title: 'Quote Date',
    },
    totalVATInclusive: {
      type: 'number',
      title: 'Total',
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
          quantity: {
            type: 'number',
            title: 'Quantity',
          },
          productClass: {
            type: 'string',
            title: 'Product Class'
          },
          productClassDescription: {
            type: 'string',
            title: 'Product Class Description'
          },
          totalVATExclusive: {
            type: 'number',
            title: 'Total Vat (Excl)',
          },
        },
      },
    },
  },
};
