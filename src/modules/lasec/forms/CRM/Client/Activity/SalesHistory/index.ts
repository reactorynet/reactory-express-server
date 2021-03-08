import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from './graphql';
import $schema from './schema';
import { SalesHistoryFilterByOptions } from '../shared';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

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
        { title: 'Account Number', field: 'accountNumber' },
        { title: 'Customer', field: 'customer' },
        { title: 'Invoice Number', field: 'invoiceNumber' },
        {
          title: 'ISO No.',
          field: 'salesOrderNumber',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.quoteId': ['formData.quoteId', 'query.quoteId'],
              'rowData.salesOrderNumber': ['formData.orderId', 'query.orderId'],
              'rowData.poNumber': ['formData.poNumber', 'query.poNumber'],
              'rowData.orderDate': ['formData.orderDate', 'query.orderDate'],
              'rowData.customer': ['formData.customer', 'query.customer'],
              'rowData.client': ['formData.header.client', 'query.client'],
              'rowData.orderStatus': ['formData.orderStatus', 'query.orderStatus'],
              'rowData.currency': ['formData.currency', 'query.currency'],
              'rowData.orderType': ['formData.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['formData.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['formData.warehouseNote', 'query.warehouseNote'],
              'rowData.deliveryNote': ['formData.deliveryNote', 'query.deliveryNote'],
              'rowData.salesTeam': ['formData.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.salesOrderNumber}',
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body1',
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
            windowTitle: 'Details view for Order # ${rowData.salesOrderNumber}',
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Sales Order', '${rowData.salesOrderNumber}'],
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } } }
            }
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'PO Number', field: 'poNumber' },
        {
          title: 'Order Date',
          field: 'orderDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${api.utils.moment(rowData.orderDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.orderDate': 'value',
          }
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
      },
      componentMap: {
        Toolbar: 'lasec-crm.SalesHistoryGridToolbar@1.0.0',
        DetailsPanel: 'lasec-crm.salesHistoryTableDetailPanel@1.0.0',
      },
      toolbarPropsMap: {
        'formContext.formData.id': 'query.id',
        'formContext.formData.search': 'query.search',
        'formContext.formData.filterBy': 'query.filterBy',
      },
      toolbarProps: {
        filterBy: 'client_id',
        use_case: 'client_activity',
      },
      remoteData: true,
      query: 'client_sales_history',
      variables: {
        'query.id': 'clientId',
        'query.search': 'search',
        'query.filter': ['filter', 'clientId'],
        'query.filterBy': 'filterBy',
        'query.paging': 'paging',
        'query.periodStart': 'periodStart',
        'query.periodEnd': 'periodEnd',
        'query.year': 'year',
        'query.years': 'years',
        'query.month': 'month',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'year': 'year',
        'years': 'years',
        'month': 'month',
        'salesHistory': 'data'
      },

    },
  }
};

const LasecCRMClientSalesHistory: Reactory.IReactoryForm = {
  id: 'LasecCRMClientSalesHistory',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360',
      name: 'reactory.plugin.lasec360',
      type: 'script',
      uri: `${ENVIRONMENT.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
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
