import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from './graphql';
import $schema from './schema';
import { SalesHistoryFilterByOptions } from '../shared';

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
      search: { md: 4, sm: 12 },
      filterBy: { md: 4, sm: 12 },
      filter: { md: 4, sm: 12 },
      periodStart: { md: 6, xs: 12 },
      periodEnd: { md: 6, xs: 12 },
      // dateFilter: { md: 6, xs: 12 },
      client: { md: 6, xs: 12 },
      customer: { md: 6, xs: 12 },
    },
    {
      salesHistory: { xs: 12 }
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
      selectOptions: SalesHistoryFilterByOptions,
    },
  },
  filter: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
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

  salesHistory: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Order Type', field: 'orderType' },
        {
          title: 'Quote Date',
          field: 'quoteDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.quoteDate ? api.utils.moment(rowData.quoteDate).format(\'DD MMM YYYY\') : ""}'
              }
            },
          },
          propsMap: {
            'rowData.quoteDate': 'value',
          }
        },
        { title: 'Quote Number', field: 'quoteNumber' },
        {
          title: 'Order Date',
          field: 'orderDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.orderDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.orderDate': 'value',
          }
        },
        { title: 'ISO No.', field: 'isoNumber' },
        { title: 'Dispatches', field: 'dispatches' },
        { title: 'Customer', field: 'customer' },
        { title: 'Client', field: 'client' },
        { title: 'PO Number', field: 'poNumber' },
        {
          title: 'Inv Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.value': 'value',
          },
        },
        { title: 'Client Rep Code', field: 'salesTeamId' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.id': 'clientId',
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.filter': 'filter',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.periodStart': 'periodStart',
        'props.formContext.$formData.periodEnd': 'periodEnd',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'salesHistory.[].id': 'data.[].id',
        'salesHistory.[].orderType': 'data.[].orderType',
        'salesHistory.[].quoteDate': 'data.[].quoteDate',
        'salesHistory.[].quoteNumber': 'data.[].quoteNumber',
        'salesHistory.[].orderDate': 'data.[].orderDate',
        'salesHistory.[].iso': 'data.[].isoNumber',
        'salesHistory.[].dispatches': 'data.[].dispatches',
        'salesHistory.[].customer': 'data.[].customer',
        'salesHistory.[].client': 'data.[].client',
        'salesHistory.[].poNumber': 'data.[].poNumber',
        'salesHistory.[].value': 'data.[].value',
        'salesHistory.[].salesTeamId': 'data.[].salesTeamId',

      },
    },
  }
};

const LasecCRMClientSalesHistory: Reactory.IReactoryForm = {
  id: 'LasecCRMClientSalesHistory',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Client Activities Sales History',
  tags: ['CMS Client Activities Sales History'],
  registerAsComponent: true,
  name: 'LasecCRMClientSalesHistory',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    filterBy: "any_field",
    invoices: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMClientSalesHistory;
