export default {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {      
      statusName: { md: 6, sm: 12 },
      totalVATExclusive: { md: 3, sm: 12 },
      GP: { md: 3, sm: 4 },
      actualGP: { md: 3, sm: 4},
      totalDiscount: { md: 3, sm: 4},
    },
    {
      companyTradingName: { md: 6, sm: 12 },
      customerName: { md: 6, sm: 12 },
    },
    {
      created: { md: 4, sm: 12 },
      modified: { md: 4, sm: 12 },    
      note: { md: 4, sm: 12 }
    },
    {
      quoteLineItems: { md: 12 },
    },
    {
      timeline: { md: 12 },
    }
  ],
  statusName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Status: ${formData}',
    },
  },
  totalVATExclusive: {
    'ui:widget': 'CurrencyWidget',
    'ui:options': {
      valueProp: 'formData'
    }
  },
  totalDiscount: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Discount: ${formData}',
    }
  },
  GP: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'GP: ${formData}',
      icon: 'money',
      iconPosition: 'left', 
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
    }
  },
  actualGP: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Actual GP: ${formData}',
      icon: 'money',
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
  modified: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Modified: ${formData}',
      icon: 'time',
      iconPosition: 'left', 
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
    }
  },
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
  customerAvatar: {

  },
  timeline:{
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      primaryText: '${props.api.utils.moment(item.when).format("YYYY-MM-DD HH:mm")} ${item.what}',
      secondaryText: '${item.notes}',
      showAvatar: true,
      avatarSrc: '${props.api.getAvatar(item.who)}',
      iconField: 'actionType',
      iconFieldMap: {
        'default': 'history',
        'client-visit': 'face',
        'email': 'email',
        'follow-up-call': 'voicemail',
      },      
    }
  },
  quoteLineItems: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [        
        { title: 'Header', field: 'headerText', defaultGroupOrder: 0 },
        { title: 'Code', field: 'code' },
        { title: 'Title', field: 'title' },
        { title: 'GP %', field: 'GP' },        
        { title: 'Discount %', field: 'discount' },        
        { title: 'Quantity', field: 'quantity' },
        { title: 'Total (VAT Excl)', 
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
};
