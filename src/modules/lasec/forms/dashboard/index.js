import { defaultFormProps } from '../../../../data/forms/defs';
import { cloneDeep } from 'lodash';
import moment from 'moment';

const {
  CDN_ROOT,
} = process.env;

const chartSchema = {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {

          }
        }
      },
      options: {
        type: 'object'
      }
    }
}

export const CrmDashboardSchema = {
  type: 'object',
  title: '',
  properties: {
    toolbar: {
      type: 'object',
      title: 'Filter',
      properties: {
        period: {
          type: 'string',
          title: 'Period',
          enum: [
            'today',
            'yesterday',
            'this-week',
            'last-week',
            'this-month',
            'last-month',
            'this-year',
            'last-year',
            'custom',
          ],
        },
        periodStart: {
          type: 'string',
          title: 'Period Start',
          description: 'Start of the period for which to collate quote data',
        },
        periodEnd: {
          type: 'string',
          title: 'Period End',
          description: 'End of the period for which to collate quote data',
        },
        agentFilter: {
          type: 'array',          
          title: 'Rep Selection',
          items: {
            type: 'string',
            title: 'User Id'
          },          
        },
      },
    },    
    charts: {
      type: 'object',
      title: 'Charts',
      description: 'Charts Container',
      properties: {
        quoteStatusFunnel: {
          type: 'object',
          title: 'Quote Status Funnel',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                title: 'Data Point',
                properties: {
                  value: {
                    type: 'number',
                    title: 'value',            
                  },
                  name: {
                    type: 'string',
                    title: 'name'
                  },
                  fill: {
                    type: 'string',
                    title: 'fillcolor'
                  }
                }
              }              
            },                    
          },
        },        
        quoteStatusPie: {
          type: 'object',
          title: 'Quote Status Funnel',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: {
                    type: 'number',
                    title: 'value',            
                  },
                  name: {
                    type: 'string',
                    title: 'name'
                  },
                  fill: {
                    type: 'string',
                    title: 'fillcolor'
                  }
                }
              }            
            }
          }          
        },
        quoteStatusComposed: {
          type: 'object',
          title: 'Quote Status Funnel',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: {
                    type: 'number',
                    title: 'value',            
                  },
                  name: {
                    type: 'string',
                    title: 'name'
                  },
                  fill: {
                    type: 'string',
                    title: 'fillcolor'
                  }
                }
              }            
            }
          }          
        }
      }      
    },
    totalQuotes: {
      type: 'number',
      title: 'Total Good',
    },
    totalBad: {
      type: 'number',
      title: 'Total Bad',
    },
    combinedData: {
      type: 'string',
      title: 'combined'
    },        
    statusSummary: {
      title: 'Status Funnel',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statusGroup: {
            type: 'string',
            title: 'Status Group',
          },
          statusKey: {
            type: 'string',
            title: 'Status Key',
          },
          status: {
            type: 'string',
            title: 'status',
          },
          good: {
            type: 'number',
            title: 'Good',
          },
          naughty: {
            type: 'number',
            title: '',
          },
        },
      },
    },    
    quotes: {
      type: 'array',
      title: 'Quote Grid',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            title: 'Quote Id',
          },
          status: {
            type: 'string',
            title: 'Status',
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
        },
      },
    },
  },
};


const CrmDashboardSchemaNoDash = cloneDeep(CrmDashboardSchema);
delete CrmDashboardSchemaNoDash.properties.totalQuotes;
delete CrmDashboardSchemaNoDash.properties.statusSummary;

export const CrmDashboardUISchema = {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [    
    {
      toolbar: { md: 12 },
    },
    {
      totalQuotes: { md: 6, sm: 12 },
      totalBad: { md: 6, sm: 12 },
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
        // period: { md: 3, sm: 6, xs: 12 },
        periodStart: { md: 3, sm: 6, xs: 12 },
        periodEnd: { md: 3, sm: 6, xs: 12 },
        agentFilter: { md: 3, sm: 6, xs: 12 }
      },
    ],
    /*
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
    */
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
      'ui:widget': 'HiddenWidget', 
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
      format: '${formData}',
      variant: 'h3',
      title: 'Total Quotes',
    }
  },  
 
  totalBad: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'h3',
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
          title: 'Quote Id',
          field: 'id',
          component: 'core.Link@1.0.0',
          props: {
            link: '/quote\/${id}\/details',
            uiSchema: {
              'ui:options': {
                format: '/quote\/${id}\/details',
                title: '${id}',
              },
            },
          },
        },
        { title: 'Status', field: 'status' },
        { title: 'Company', field: 'companyTradingName', defaultGroupOrder: 0 },
        { title: 'Customer', field: 'customerName' },
        { title: 'Total (VAT Excl)', field: 'totalVATExclusive' },
        { title: 'Total (VAT Incl)', field: 'totalVATInclusive' },
      ],
      options: {
        grouping: true,
      },
      title: 'Quotes List',
    },
  },
};

const CrmDashboardUISchemaNoDash = {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      toolbar: { md: 12 },
    },
    {
      quotes: { md: 12 },
    },
  ],
  toolbar: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        // period: { md: 3, sm: 6 },
        periodStart: { md: 3, sm: 6 },
        periodEnd: { md: 3, sm: 6 },
      },
    ],
    'ui:wrapper': 'Toolbar',
    'ui:widget': 'MaterialToolbar',
    /*
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
    */
    periodStart: {
      'ui:widget': 'DateSelectorWidget',
    },
    periodEnd: {
      'ui:widget': 'DateSelectorWidget',
    },
  },
  quotes: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Quote Id',
          field: 'id',
          component: 'core.Link@1.0.0',
          props: {
            link: '/360/crm/customer/\/${customer.id}/\/quote\/${id}\/option/46944',
            uiSchema: {
              'ui:options': {
                format: '/360/crm/customer/\/${customer.id}/\/quote\/${id}\/option/46944',
                title: 'View ${id}',
              },
            },
          },
        },
        { title: 'Status', field: 'status' },
        { title: 'Company', field: 'companyTradingName', defaultGroupOrder: 0 },
        { title: 'Customer', field: 'customerName' },
        { title: 'Total (VAT Excl)', field: 'totalVATExclusive' },
        { title: 'Total (VAT Incl)', field: 'totalVATInclusive' },
      ],
      options: {
        grouping: true,
      },
      title: 'Quotes List',
    },
  },
};

const defaultQueryText = `query LasecGetDashboard($dashparams: LasecQuoteQueryInput){
  LasecGetDashboard(dashparams: $dashparams){
    id
    period
    periodStart
    periodEnd
    repIds
    totalQuotes
    totalBad
    statusSummary {
      key
      title
      good
      naughty
      category
    }
    charts {
      quoteStatusFunnel {
        data
        options
      }
      quoteStatusPie {
        data
        options
      }
      quoteStatusComposed {
        data
        options
      }
    }
    quotes { 
      id
      status
      customer {
        id
        fullName
      }         
      company {
        id
        tradingName
      }
      totalVATExclusive
      totalVAT
      totalVATInclusive
      GP
      actualGP
      created
      modified
      expirationDate
      note
    }
  }
}`;

const graphql = {
  query: {
    name: 'LasecGetDashboard',
    text: defaultQueryText,
    variables: {
      'formData.toolbar.period': 'dashparams.period',
      'formData.toolbar.periodStart': 'dashparams.periodStart',
      'formData.toolbar.periodEnd': 'dashparams.periodEnd'
    },
    resultMap: {
      id: 'id',
      period: 'toolbar.period',
      periodStart: 'toolbar.periodStart',
      periodEnd: 'toolbar.periodEnd',
      repIds: 'toolbar.repIds',
      statusSummary: 'statusSummary',
      quotes: 'quotes',      
      totalQuotes: 'totalQuotes',
      totalBad: 'totalBad',
      charts: 'charts',      
      'quotes[].customer.fullName': 'quotes[].customerName',
      'quotes[].company.tradingName': 'quotes[].companyTradingName',
    },
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  /*mutation: {
    edit: {
      name: 'LasecGetDashboard',
      text: defaultQueryText,
      objectMap: true,
      variables: {
        'formData.toolbar.period': 'period',
        'formData.toolbar.periodStart': 'periodStart',
        'formData.toolbar.periodEnd': 'periodEnd'
      },
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'refresh',
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLMutationError',
      },
    },
  },
  */
};

export const CrmDashboardForm = {
  id: 'CrmDashboard',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360', 
      name: 'reactory.plugin.lasec360', 
      type: 'script', 
      uri: `${CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
  title: 'CRM Dashboard',
  tags: ['CRM Dashboard'],
  schema: CrmDashboardSchema,
  registerAsComponent: true,
  components: ['lasec-crm.Lasec360Plugin@1.0.0'],
  name: 'Dashboard',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: CrmDashboardUISchema,
  graphql,
  defaultFormValue: {
    toolbar: {
      period: 'this-week',
      periodStart: moment().startOf('week').toISOString(),
      periodEnd: moment().endOf('week').toISOString()
    }
  }
};

export const QuotesList = {
  id: 'LasecQuotes',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quotes List Dashboard',
  tags: ['CRM Dashboard'],
  schema: { ...CrmDashboardSchemaNoDash },
  registerAsComponent: true,
  name: 'Quotes',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: { ...CrmDashboardUISchemaNoDash },
  graphql,
};

export const QuoteDetail = {
  id: 'QuoteDetail',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quotes Detail',
  tags: ['CRM Dashboard'],
  schema: {
    type: 'object',
    title: '${formData.id}',
    description: 'Quote Details for ${formData.id}',
    properties: {
      id: {
        type: 'string',
        title: 'Quote Id',
      },
      status: {
        type: 'string',
        title: 'Status',
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
      quoteLineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Line Entry',
            },
            qty: {
              type: 'number',
              title: 'Quantity',
            },
          },
        },
      },
    },
  },
  registerAsComponent: true,
  name: 'QuoteDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: {
    submitIcon: 'refresh',
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        id: { md: 6 },
        status: { md: 6 },
      },
      {
        companyTradingName: { md: 6 },
        customerName: { md: 6 },
      },
      {
        quoteLineItems: { md: 12 },
      },
    ],
    quoteLineItems: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [
          {
            title: 'Quote Id',
            field: 'id',
          },
          { title: 'Quantity', field: 'qty' },
          { title: 'Total (VAT Excl)', field: 'totalVATExclusive' },
          { title: 'Total (VAT Incl)', field: 'totalVATInclusive' },
        ],
        options: {
          grouping: true,
        },
        title: 'Quotes List',
      },
    },
  },
  graphql,
};

export default {
  CrmDashboardForm,
  QuotesList,
  QuoteDetail,
};
