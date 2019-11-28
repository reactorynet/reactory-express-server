
const {
  CDN_ROOT,
} = process.env;

export default {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      toolbar: { md: 3, sm: 12, xs: 12 },
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
        period: { md: 3, sm: 12, xs: 12 },
        periodStart: { md: 3, sm: 12, xs: 12 },
        periodEnd: { md: 3, sm: 12, xs: 12 },
      },
      {
        agentSelection: { md: 3, sm: 12, xs: 12 },
      },
      {
        productClass: { md: 3, sm: 12, xs: 12 },
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

    productClass: {
      'ui:widget': 'SelectWithDataWidget',
      'ui:options': {
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
        quoteStatusPie: { md: 12, sm: 12, xs: 12 },
        // quoteStatusComposed: { md: 12, sm: 12, xs: 12 }
      },
    ],
    // quoteStatusFunnel: {
    //   'ui:widget': 'FunnelChartWidget',
    //   'ui:options': {

    //   }
    // },
    quoteProductPie: {
      'ui:widget': 'PieChartWidget',
      'ui:options': {
        size: 80,
        thickness: 5,
        variant: 'static',
      },
    },
    // quoteStatusComposed: {
    //   'ui:widget': 'ComposedChartWidget',
    //   'ui:options': {
    //   }
    // }
  },
  // totalQuotes: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: 'Total Quotes: ${formData}',
  //     variant: 'h3',
  //     title: 'Total Quotes',
  //   }
  // },

  // target: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: 'Target: ${formData}',
  //     variant: 'h4',
  //   }
  // },

  // targetPercent: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: 'Target %: ${formData}',
  //     variant: 'h4',
  //   }
  // },

  // totalBad: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: 'Naughty Quotes: ${formData}',
  //     variant: 'h4',
  //     title: 'Total Bad',
  //   }
  // },

  // statusSummary: {
  //   'ui:widget': 'MaterialTableWidget',
  //   'ui:options': {
  //     columns: [
  //       { title: 'Status Group', field: 'title' },
  //       { title: 'Good', field: 'good' },
  //       { title: 'Naughty', field: 'naughty' },
  //       { title: 'Total', field: 'totalVATExclusive',
  //         component: 'core.CurrencyLabel@1.0.0',
  //         propsMap: {
  //           totalVATExclusive: 'value',
  //         },
  //     },
  //     ],
  //     options: {
  //       grouping: true,
  //     },
  //   },
  // },

  // quotes: {
  //   title: 'Quotes List',
  //   'ui:widget': 'MaterialTableWidget',
  //   'ui:options': {
  //     columns: [
  //       {
  //         title: 'Overview',
  //         field: 'code',
  //         component: 'core.SlideOutLauncher@1.0.0',
  //         props: {
  //           componentFqn: 'lasec-crm.QuoteDetail@1.0.0',
  //           componentProps: {
  //             'code': ['data.quote_id', 'data.code', 'query.quote_id']
  //           },
  //           slideDirection: 'down',
  //           buttonTitle: '${code}',
  //           windowTitle: 'Details view for ${code}',
  //         },
  //       },
  //       {
  //         title: 'Overview',
  //         field: 'code',
  //         component: 'core.SlideOutLauncher@1.0.0',
  //         props: {
  //           componentFqn: 'lasec-crm.UpdateQuoteStatus@1.0.0',
  //           componentProps: {
  //             'code': ['data.quote_id', 'data.code', 'query.quote_id']
  //           },
  //           slideDirection: 'down',
  //           buttonTitle: 'Next Actions',
  //           windowTitle: 'Next Actions ${code}',
  //         },
  //       },
  //       { title: 'Status', field: 'statusName', defaultGroupOrder: 0 },
  //       { title: 'Company', field: 'companyTradingName', defaultGroupOrder: 1 },
  //       { title: 'Customer', field: 'customerName' },
  //       { title: 'Total (VAT Excl)',
  //         field: 'totalVATExclusive',
  //         component: 'core.CurrencyLabel@1.0.0',
  //         propsMap: {
  //           totalVATExclusive: 'value',
  //         },
  //       },
  //       {
  //         title: 'GP (%)',
  //         field: 'GP',
  //       },
  //     ],
  //     options: {
  //       grouping: true,
  //     },
  //     title: 'Quotes List',
  //   },
  // },
};
