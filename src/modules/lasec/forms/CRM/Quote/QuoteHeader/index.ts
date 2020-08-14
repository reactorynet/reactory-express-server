import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    client: {
      type: 'string',
      title: 'Show'
    },
    repCode: {
      type: "string",
      title: "Quote Number"
    },
    quoteType: {
      type: "string",
      title: "Quote Status"
    },
    validDate: {
      type: "string",
      title: "Quote Date"
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      client: { md: 6, xs: 12 },
      repCode: { md: 6, xs: 12 },
      quoteType: { md: 6, xs: 12 },
      validDate: { md: 6, xs: 12 },
    },
    {
      invoices: { xs: 12 }
    }
  ],

  client: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Client',
      title: 'Search for a Client'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMClientLookupTable@1.0.0',
      componentProps: {},
    },
  },

  repCode: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
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

  quoteType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'Normal', value: 'normal', label: 'Normal' },
      ],
    },
  },

  validDate: {
    'ui:widget': 'DateSelectorWidget',
  },
};


const LasecCRMQuoteHeaderForm: Reactory.IReactoryForm = {
  id: 'LasecCRMQuoteHeaderForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Quote Header',
  tags: ['CRM Quote Header'],
  registerAsComponent: true,
  name: 'LasecCRMQuoteHeaderForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  // graphql: $graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    filterBy: "any_field",
    search: "",
    quotes: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMQuoteHeaderForm;
