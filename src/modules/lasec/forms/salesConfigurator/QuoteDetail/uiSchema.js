export default {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      companyTradingName: { md: 6, sm: 12 },
      customerName: { md: 6, sm: 12 },
    },
    {
      created: { md: 4, sm: 12 },
    },
    {
      quoteLineItems: { md: 12 },
    },
    {
      totalVATInclusive: { md: 3, sm: 12 },
    }
  ],

  companyTradingName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      icon: 'account_circle',
      iconPosition: 'left',
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
    }
  },
  customerName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      icon: 'account_circle',
      iconPosition: 'left',
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
    }
  },

  created: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Created: ${formData}',
      icon: 'time',
      iconPosition: 'left',
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
    }
  },

  quoteLineItems: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Title', field: 'title' },
        { title: 'Quantity', field: 'quantity' },
        {
          title: 'Total',
          field: 'totalVATExclusive',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            totalVATExclusive: 'value',
          },
        },
      ],
      options: {
        grouping: true,
      },
      title: 'Quotes List',
    },
  },

  totalVATInclusive: {
    'ui:widget': 'CurrencyWidget',
    'ui:options': {
      valueProp: 'formData'
    }
  },


};
