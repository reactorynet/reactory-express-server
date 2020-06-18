
import { LasecUserLookupQuery } from './graphql';

const {
  CDN_ROOT,
} = process.env;

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
      activeSurveys: { md: 3, xs: 12 },
      totalAssessments: { md: 3, xs: 12 },
      completedAssessments: { md: 3, xs: 12 },
      responseRate: { md: 3, xs: 12 },
    },
    {
      charts: { xs: 12 },
    },   
    {
      assessments: { xs: 12 },
    },
  ],

  /**
   * Primary Toolbar for salesDashboard
   */
  toolbar: {
    'ui:wrapper': 'Toolbar',
    'ui:widget': 'MaterialToolbar',
    'ui:field': 'GridLayout',
    'ui:grid-options': {
      spacing: 4,
    },
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
      }
    ],

    /**
     * Period selection widget
     */
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
          /*{ key: 'custom', value: 'custom', label: 'Custom User Selection' },*/
        ],
      },
    },

    teamFilter: {
      'ui:widget': 'SelectWithDataWidget',
      'ui:options': {
        multiSelect: true,
        inputProps: {
          variant: 'outline'
        },
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

    /**
       * The agent should be pulled from AD groups.
       **/
    userFilter: {
      'ui:graphql': LasecUserLookupQuery,
      'ui:widget': 'UserSelectorWidget',
      'ui:options': {
        widget: 'UserSelectorWidget',
        lookupWidget: 'core.UserSearch',
        lookupOnSelect: 'onSelect',        
      },
    },
  },

  /**
   * Totals
   */
  activeSurveys: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Active Surveys: ${formData}',
      variant: 'h5',
    }
  },

  totalAssessments: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Total Assessments ${formData}',
      variant: 'h5',
      // title: 'Target:'
    }
  },

  completedAssessments: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Completed Assessments: ${formData}',
      variant: 'h5',
      // title: 'Total Bad',
    }
  },

  responseRate: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: 'Response Rate: ${Math.floor(formData)}%',
      variant: 'h5',
      // title: 'Target %:'
    }
  },

  
  /**
   * Charts / Summary Area
   */
  charts: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {        
        culture: { md: 6, sm: 12, xs: 12 },
        team180: { md: 12, sm: 12, xs: 12 },
        leadership360: { md: 6, sm: 12, xs: 12 },        
        individual360: { md: 6, sm: 12, xs: 12 },         
      },      
    ],
    culture: {
      'ui:widget': 'PieChartWidget',
      'ui:options': {
        size: 120,
        thickness: 5,
        variant: 'static',
      },
    },  
    team180: {
      'ui:widget': 'PieChartWidget',
      'ui:options': {
        size: 120,
        thickness: 5,
        variant: 'static',
      },
    },
    leadership360: {
      'ui:widget': 'PieChartWidget',
      'ui:options': {
        size: 120,
        thickness: 5,
        variant: 'static',
      },
    },    
    individual360: {
      'ui:widget': 'PieChartWidget',
      'ui:options': {
        size: 120,
        thickness: 5,
        variant: 'static',
      },
    },        
  },

  /**
   * Next Actions Section
   **/  

 
  assessments: {
    title: 'Assessments List',
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
              'rowData.code': ['data.quote_id', 'data.code', 'query.quote_id']
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.code}',
            windowTitle: 'Details view for ${rowData.code}',
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        {
          title: 'Next Actions',
          field: 'code',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.UpdateQuoteStatus@1.0.0',
            componentProps: {
              'rowData.code': ['data.quote_id', 'data.code', 'query.quote_id']
            },
            slideDirection: 'down',            
            buttonTitle: 'Next Actions',
            windowTitle: 'Next Actions ${rowData.code}',
            buttonIcon: 'add_alert'
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'Status', field: 'statusName', defaultGroupOrder: 0 },
        { title: 'Company', field: 'companyTradingName', defaultGroupOrder: 1 },
        { title: 'Customer', field: 'customerName', style: { paddingTop: '8px' } },
        {
          title: 'Total (VAT Excl)',
          field: 'totalVATExclusive',
          component: 'core.CurrencyLabel@1.0.0',  
          props: {
            uiSchema: {
              'ui:options': {
                valueProp: 'totalVATExclusive'
              }
            }
          },        
          propsMap: {
            'rowData.totalVATExclusive': 'totalVATExclusive',
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
      title: 'Assessments',
    },
  },
};
