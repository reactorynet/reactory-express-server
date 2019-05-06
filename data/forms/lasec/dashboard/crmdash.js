import { defaultFormProps } from '../../defs';

export const CrmDashboardSchema = {
  type: 'object',
  title: '',
  properties: {
    toolbar: {
      type: 'object',
      title: '',
      properties: {
        periodPreset: {
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
        from: {
          type: 'string',
          title: 'Period Start',
          description: 'Start of the period for which to collate quote data',
        },
        till: {
          type: 'string',
          title: 'Period End',
          description: 'End of the period for which to collate quote data',
        },
      },
    },
    totalQuotes: {
      type: 'number',
      title: 'Total Quotes',
    },
    quoteStatusFunnel: {
      type: 'object',
      title: 'Status Funnel',
      properties: {
        filter: {
          type: 'object',
          title: 'Status Filters',
          properties: {
            repIds: {
              type: 'array',
              items: {
                type: 'string',
                title: 'Rep',
              },
            },
          },
        },
        results: {
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
      },
    },
  },
};

export const CrmDashboardUISchema = {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      toolbar: { md: 12 },
    },
    {
      quoteStatusFunnel: { md: 12 },
    },
    {
      totalQuotes: { md: 12 },
    },
  ],
  toolbar: {
    'ui:wrapper': 'Toolbar',
    'ui:widget': 'MaterialToolbar',
    periodPreset: {
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
    from: {
      'ui:widget': 'DateSelectorWidget',
    },
    till: {
      'ui:widget': 'DateSelectorWidget',
    },
  },
  totalQuotes: {
    'ui:widget': 'ProgressWidget',
    'ui:options': {
      size: 80,
      thickness: 5,
      variant: 'static',
    },
  },
  quoteStatusFunnel: {
    results: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [
          { title: 'Status Group', field: 'statusGroup' },
          { title: 'Status Key', field: 'statusKey' },
          { title: 'Status', field: 'status' },
          { title: 'Good', field: 'good' },
          { title: 'Naughty', field: 'naughty' },
        ],
        groupBy: 'statusGroup',
      },
    },
  },
};

export const CrmDashboardForm = {
  id: 'CrmDashboard',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Dashboard',
  tags: ['CRM Dashboard'],
  schema: CrmDashboardSchema,
  registerAsComponent: true,
  name: 'Dashboard',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: CrmDashboardUISchema,
};


export default {
  CrmDashboardForm,
};
