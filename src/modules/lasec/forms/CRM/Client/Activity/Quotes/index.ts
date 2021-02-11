import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from './graphql';
import $schema from './schema';
import { FilterByOptions } from '../shared';

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
      quotes: { sm: 12, md: 12, lg: 12 }
    }
  ],

  paging: {
    'ui:widget': 'HiddenWidget'
  },
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Search',
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  filterBy: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: FilterByOptions,
    },
  },
  dateFilter: {
    'ui:widget': 'DateSelectorWidget',
  },
  selectFilter: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      showLabel: false,
      multiSelect: false,
      query: `query LasecGetCustomerFilterLookup($filterBy: String!) {
        LasecGetCustomerFilterLookup(filterBy: $filterBy) {
          id
          name
        }
      }`,
      propertyMap: {
        'formContext.$formData.filterBy': 'filterBy'
      },
      resultItem: 'LasecGetCustomerFilterLookup',
      resultsMap: {
        'LasecGetCustomerFilterLookup.[].id': ['[].key', '[].value'],
        'LasecGetCustomerFilterLookup.[].name': '[].label',
      },
    },
  },
  periodStart: {
    'ui:widget': 'DateSelectorWidget',
  },
  periodEnd: {
    'ui:widget': 'DateSelectorWidget',
  },
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
  customer: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      componentProps: {},
    },
  },

  quotes: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Quote Number',
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
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        {
          title: 'Quote Date',
          field: 'date',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.date).format(\'DD MMM YYYY HH:mm\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        {
          title: 'Quote Status',
          field: 'status',
          width: '100px',
          components: [
            {
              component: 'lasec-crm.QuoteStatus@1.0.0',
              props: {
                usecase: 'grid'
              },
              propsMap: {
                'rowData.status': 'value',
                'rowData': 'quote'
              },
            },
          ],
        },
        {
          title: 'Total Quote Value', field: 'total',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.total': 'value',
          },
        },
        { title: 'Customer', field: 'companyTradingName' },
        { title: 'Account Number', field: 'accountNumber' },
        { title: 'Quote Type', field: 'quoteType' },
        { title: 'Rep Code', field: 'repCode' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
      },
      componentMap: {
        Toolbar: 'lasec-crm.QuoteGridToolbar@1.0.0',
      },
      toobarPropsMap: {
        'formContext.formData.id': 'query.id',
        'formContext.formData.search': 'query.search',
        'toolbarProps.filterBy': 'query.filterBy',
        'formContext.formData.filter': 'query.filter',
        'toolbarProps.use_case': 'use_case',
      },
      toolbarProps: {
        filterBy: 'client_id',
        use_case: 'client_activity',
      },
      remoteData: true,
      query: 'quotes',
      variables: {
        'query.id': 'clientId',
        'query.search': 'search',
        'query.filter': 'filter',
        'query.filterBy': 'filterBy',
        'query.paging': 'paging',
        'query.periodStart': 'periodStart',
        'query.periodEnd': 'periodEnd',
        'query.dateFilter': 'dateFilter',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'clientId': ['id', 'query.id'],
        'quotes[].code': 'data[].code',
        'quotes[].created': 'data[].date',
        'quotes[].statusName': 'data[].statusName',
        'quotes[].allowed_statuses[]': 'data[].allowed_statuses',
        'quotes[].status': 'data[].status',
        'quotes[].totalVATInclusive': 'data[].total',
        'quotes[].customer.fullName': 'data[].client',
        'quotes[].company.tradingName': 'data[].companyTradingName',
        'quotes[].company.code': 'data[].accountNumber',
        'quotes[].meta.source.sales_team_id': 'data[].repCode',
        'quotes[].meta.source.quote_type': 'data[].quoteType',
      },
    },
  }
};

const LasecCRMClientQuoteActivities: Reactory.IReactoryForm = {
  id: 'LasecCRMClientQuoteActivities',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Client Activities Quotes',
  tags: ['CMS Client Activities Quotes'],
  registerAsComponent: true,
  name: 'LasecCRMClientQuoteActivities',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    filterBy: "any_field",
    quotes: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMClientQuoteActivities;
