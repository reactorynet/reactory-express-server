
const {
  CDN_ROOT,
} = process.env;

const $toolbar = {
  'ui:wrapper': 'Toolbar',
  'ui:widget': 'MaterialToolbar',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      period: { md: 3, sm: 12, xs: 12 },
      periodStart: { md: 3, sm: 12, xs: 12 },
      periodEnd: { md: 3, sm: 12, xs: 12 },
    },
    {
      agentSelection: { md: 3, sm: 12, xs: 12 },
      teamFilter: { md: 3, sm: 12, xs: 12 },
      userFilter: { md: 3, sm: 12, xs: 12 },
      productClass: { lg: 6, md: 6, sm: 12, xs: 12 },
    },
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

  periodStart: {
    'ui:widget': 'DateSelectorWidget',
  },
  periodEnd: {
    'ui:widget': 'DateSelectorWidget',
  },

  agentSelection: {
    'ui:widget': 'SelectWidget',
    'ui:options': {

      selectOptions: [
        { key: 'me', value: 'me', label: 'My Quotes' },
        { key: 'team', value: 'team', label: 'Team / Reps' },
        { key: 'custom', value: 'custom', label: 'Custom User Selection' },
      ],
    },
  },

  productClass: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: true,
      query: `query LasecGetProductClassList {
        LasecGetProductClassList {
          id
          name
        }
      }`,
      resultItem: 'LasecGetProductClassList',
      resultsMap: {
        'LasecGetProductClassList.[].id': ['[].key', '[].value'],
        'LasecGetProductClassList.[].name': '[].label',
      },
    },
  },

  teamFilter: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: true,
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
  },

  userFilter: {
    'ui:widget': 'UserSelectorWidget',
    'ui:options': {
      widget: 'UserSelectorWidget',
      lookupWidget: 'core.UserSearch',
      lookupOnSelect: 'onSelect',
    },
  },
};

export default {
  submitIcon: 'refresh',
  'ui:options': {
    toolbarPosition: 'top|bottom',
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 4,
  },
  'ui:grid-layout': [
    {
      toolbar: { xs: 12 },
    },
    {
      totalQuotes: { md: 3, sm: 12 },
      totalBad: { md: 3, sm: 12 },
      target: { md: 3, sm: 12 },
      targetPercent: { md: 3, sm: 12 },
    },
    {
      charts: { md: 12 },
    },
    {
      nextActions: { xs: 12 }
    },
    {
      productSummary: { lg: 12, md: 12, sm: 12, xs: 12 },
    },
    {
      quotes: { lg: 12, md: 12, sm: 12, xs: 12 },
    },
  ],
  toolbar: $toolbar,
  // TOTALS

  totalQuotes: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Total Quotes: ${formData}',
      variant: 'h4',
      title: 'Total Quotes',
    }
  },

  target: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Target: ${formData}',
      variant: 'h4',
      title: 'Target',
    }
  },

  targetPercent: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Target %: ${formData}',
      variant: 'h4',
      title: 'Target %'
    }
  },

  totalBad: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Naughty Quotes: ${formData}',
      variant: 'h4',
      title: 'Total Bad',
    }
  },

  // CHARTS

  charts: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        quoteProductPie: { lg: 6, md: 6, sm: 12, xs: 12 },
      },
      {
        quoteProductFunnel: { lg: 12, md: 12, sm: 12, xs: 12 }
      },
      {
        quoteStatusComposed: { lg: 12, md: 12, sm: 12, xs: 12 }
      }
    ],    
    quoteProductPie: {
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
    },    
  },

  /**
   * Next Actions Section
   **/
  nextActions: {
    'ui:toolbar': {
      buttons: [
        {
          command: 'syncNextActionsToOutlook',
          id: 'SyncNextActionsToOutlook',
          color: 'primary',
          icon: 'refresh',
          tooltip: 'Synchronize next actions to your outlook calendar',
          graphql: {
            mutation: {
              name: 'SynchronizeNextActionsToOutloook',
              text: `
              mutation SynchronizeNextActionsToOutloook($nextActions: Any!){
                SynchronizeNextActionsToOutloook(nextActions: $nextActions){
                  success
                  message
                }
              }
              `,
              variables: {
                'nextActions.actions': 'nextActions',
                'periodStart': 'periodStart',
                'periodEnd': 'periodEnd'
              },
              onSuccessMethod: 'refresh'
            }
          },
        }
      ]
    },
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        actions: { sm: 12, xs: 12 },
      }
    ],
    actions: {
      'ui:widget': 'MaterialListWidget',
      'ui:options': {
        id: 'Id',
        primaryText: '${item.actionType} due on ${props.api.utils.moment(item.next).format("YYYY.MM.DD")}',
        secondaryText: '${item.quote.code} ${item.importance} assigned to ${item.who && item.who.length > 0 ? item.who.map((w)=>(w.firstName + " " + w.lastName)) : "no one" }',
        showAvatar: false,
        icon: 'history',
        variant: 'button',
        secondaryAction: {
          iconKey: 'edit',
          label: 'Edit',
          componentFqn: 'core.SlideOutLauncher@1.0.0',
          action: 'mount:Component',
          link: '/edit/${item.id}/',
          props: {
            componentFqn: 'lasec-crm.LasecNextActionDetail@1.0.0',
            componentProps: {
              'formData': 'formData',
              'formContext.formInstanceId' : 'formData.targetFormId'
            },
            slideDirection: 'down',
            buttonTitle: 'View Details',
            windowTitle: 'Next Action ${formData.quote.code}',
            buttonVariant: 'IconButton',
          },
        },
        listProps: {
          dense: true
        }
      },
    }
  },

  // PRODUCT SUMMERY TABLE

  productSummary: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Product Group', field: 'title' },
        { title: 'Good', field: 'good' },
        { title: 'Naughty', field: 'naughty' },
        {
          title: 'Total', field: 'totalVATExclusive',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            totalVATExclusive: 'value',
          },
        },
      ],
      options: {
        grouping: true,
      },
    },
  },

  // QUOTE TABLE

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
        {
          title: 'Overview',
          field: 'code',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.UpdateQuoteStatus@1.0.0',
            componentProps: {
              'code': ['data.quote_id', 'data.code', 'query.quote_id']
            },
            slideDirection: 'down',
            buttonTitle: 'Next Actions',
            windowTitle: 'Next Actions ${code}',
          },
        },
        { title: 'Status', field: 'statusName' },
        { title: 'Product Class', field: 'productClass', defaultGroupOrder: 0 },
        { title: 'Product Description', field: 'productDescription'} ,
        { title: 'Company', field: 'companyTradingName', defaultGroupOrder: 1 },
        { title: 'Customer', field: 'customerName' },
        {
          title: 'Total (VAT Excl)',
          field: 'totalVATExclusive',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            totalVATExclusive: 'value',
          },
        },
        {
          title: 'GP (%)',
          field: 'GP',
        },
      ],
      options: {
        grouping: true,
      },
      title: 'Quotes List',
    },
  },
};
