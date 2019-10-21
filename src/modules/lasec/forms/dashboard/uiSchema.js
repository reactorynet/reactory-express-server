
const {
  CDN_ROOT,
} = process.env;

export default {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [    
    {
      toolbar: { md: 12 },
    },
    {
      totalQuotes: { md: 3, sm: 12 },
      totalBad: { md: 3, sm: 12 },
      target: {md: 3, sm: 12},
      targetPercent: {md: 3, sm: 12},      
    },       
    {
      charts: { md: 12 },
    },
    {
      statusSummary: { md: 12 },
    },
    {
      quotes: { md: 12 },
    },
  ],
  toolbar: {
    'ui:wrapper': 'Toolbar',
    'ui:widget': 'MaterialToolbar',
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        period: { md: 3, sm: 6, xs: 12 },
        periodStart: { md: 3, sm: 6, xs: 12 },
        periodEnd: { md: 3, sm: 6, xs: 12 },      
      }      
    ],
    
    period: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'today', value: 'today', label: 'Today' },
          { key: 'yesterday', value: 'yesterday', label: 'Yesterday' },
          { key: 'this-week', value: 'this-week', label: 'This Week' },
          { key: 'last-week', value: 'last-week', label: 'Last Week' },
          { key: 'this-month', value: 'this-month', label: 'This Month' },
          { key: 'last-month', value: 'last-month', label: 'Last Month' },
          { key: 'this-year', value: 'this-year', label: 'This Year' },
          { key: 'last-year', value: 'last-year', label: 'Last Year' },
          { key: 'custom', value: 'custom', label: 'Custom' },
        ],
      },
    },

    agentSelection: {
      'ui:widget': 'SelectWithDataWidget',
      'ui:options': {
        query: `query LasecSalesTeams {
          LasecSalesTeams {    
            id
            title
            meta  {
              reference
            }
          }
        }`,        
        resultItem: 'LasecSalesTeams',
        resultsMap: {
          'LasecSalesTeams.[].meta.reference': ['[].key', '[].value'],
          'LasecSalesTeams.[].title': '[].label',
        },
      },
    },

    periodStart: {
      'ui:widget': 'DateSelectorWidget',
    },
    periodEnd: {
      'ui:widget': 'DateSelectorWidget',
    },
    agentFilter: {
      /*
      The agent should be pulled from AD groups.
      */
      'ui:widget': 'UserSelectorWidget', 
      'ui:options': {
        widget: 'UserSelectorWidget',        
        lookupWidget: 'core.UserSearch',
        lookupOnSelect: 'onSelect',
      },
    }
  },
  charts: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {        
        quoteStatusFunnel: { md: 6, sm: 6, xs: 12 },
        quoteStatusPie: { md: 6, sm: 6, xs: 12 },
        quoteStatusComposed: { md: 12, sm: 12, xs: 12 }
      },
    ],
    quoteStatusFunnel: {
      'ui:widget': 'FunnelChartWidget',
      'ui:options': {
        
      }
    },
    quoteStatusPie: {
      'ui:widget': 'PieChartWidget',
      'ui:options': {        
        size: 80,
        thickness: 5,
        variant: 'static',
      },
    },
    quoteStatusComposed: {
      'ui:widget': 'ComposedChartWidget',      
      'ui:options': {
      }      
    }
  },  
  totalQuotes: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Total: ${formData}',
      variant: 'h3',
      title: 'Total Quotes',
    }
  }, 
  
  target: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Target: COMING SOON',
      variant: 'h4',      
    }
  },

  targetPercent: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Target %: COMING SOON',
      variant: 'h4',      
    }
  },
 
  totalBad: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Bad Quotes: ${formData}',
      variant: 'h4',
      title: 'Total Bad',      
    }    
  },  

  statusSummary: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Status Group', field: 'title' },
        { title: 'Status Key', field: 'key' },
        { title: 'Good', field: 'good' },
        { title: 'Naughty', field: 'naughty' },
      ],
      options: {
        grouping: true,
      },
    },
  },

  quotes: {
    title: 'Quotes List',
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Overview',
          field: 'code',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.QuoteDetail@1.0.0',
            componentProps: {
              'code': ['data.quote_id', 'data.code', 'query.quote_id']              
            },            
            slideDirection: 'down',
            buttonTitle: '${code}',            
            windowTitle: 'Details view for ${code}',
          },
        },        
        { title: 'Status', field: 'statusName', defaultGroupOrder: 0 },
        { title: 'Company', field: 'companyTradingName', defaultGroupOrder: 1 },
        { title: 'Customer', field: 'customerName' },
        { title: 'Total (VAT Excl)', 
          field: 'totalVATExclusive', 
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            totalVATExclusive: 'value',
          },
        },          
        { 
          title: 'Total (VAT Incl)', 
          field: 'totalVATInclusive',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'totalVATInclusive': 'value'
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