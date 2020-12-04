import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from './graphql';
import $schema from './schema';
import { InvoiceFilterByOptions } from '../shared';

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
      // filter: { md: 4, sm: 12 },
      periodStart: { md: 6, xs: 12 },
      periodEnd: { md: 6, xs: 12 },
      dateFilter: { md: 6, xs: 12 },
      client: { md: 6, xs: 12 },
      customer: { md: 6, xs: 12 },
    },
    {
      invoices: { xs: 12 }
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
      selectOptions: InvoiceFilterByOptions,
    },
  },
  // filter: {
  //   'ui:widget': 'SelectWithDataWidget',
  //   'ui:options': {
  //     multiSelect: false,
  //     query: `query LasecGetCustomerFilterLookup($filterBy: String!) {
  //       LasecGetCustomerFilterLookup(filterBy: $filterBy) {
  //         id
  //         name
  //       }
  //     }`,
  //     propertyMap: {
  //       'formContext.$formData.filterBy': 'filterBy'
  //     },
  //     resultItem: 'LasecGetCustomerFilterLookup',
  //     resultsMap: {
  //       'LasecGetCustomerFilterLookup.[].id': ['[].key', '[].value'],
  //       'LasecGetCustomerFilterLookup.[].name': '[].label',
  //     },
  //   },
  // },
  periodStart: {
    'ui:widget': 'DateSelectorWidget',
  },
  periodEnd: {
    'ui:widget': 'DateSelectorWidget',
  },
  dateFilter: {
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
      title: 'Search for a Customer',
      modalProps: {
        fullScreen: false,
        closeOnEvents: [
          'CloseModal:LasecCRMCustomerLookupTable'
        ]
      }
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      componentProps: {},
      componentPropertyMap: {
        'LookupComponent.props.formContext.$formData': 'formData.selected',
        'LookupComponent.props.onChange': 'onCustomerSelect',
        'LookupComponent.props.formContext': 'LookupComponentFormContext',
      },
    },
  },
  invoices: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Invoice Date',
          field: 'invoiceDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.invoiceDate ? api.utils.moment(rowData.invoiceDate).format(\'DD MMM YYYY\') : ""}'
              }
            },
          },
          propsMap: {
            'rowData.invoiceDate': 'value',
          }
        },
        // { title: 'Invoice Number', field: 'id' },
        {
          title: 'Invoice Number',
          field: 'isoNumber',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.id': ['data.id', 'query.id'],
              'rowData.quoteId': ['data.quoteId', 'query.quoteId'],
              'rowData.isoNumber': ['data.orderId', 'query.orderId'],
              'rowData.iso': ['data.iso', 'query.iso'],
              'rowData.documentIds': ['data.documentIds', 'query.documentIds'],
              'rowData.poNumber': ['data.poNumber', 'query.poNumber'],
              'rowData.orderDate': ['data.orderDate', 'query.orderDate'],
              'rowData.customer': ['data.customer', 'query.customer'],
              'rowData.client': ['data.client', 'query.client'],
              'rowData.orderStatus': ['data.orderStatus', 'query.orderStatus'],
              'rowData.currency': ['data.currency', 'query.currency'],
              'rowData.orderType': ['data.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['data.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['data.warehouseNote', 'query.warehouseNote'],
              'rowData.deliveryNote': ['data.deliveryNote', 'query.deliveryNote'],
              'rowData.salesTeam': ['data.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.id}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
                'fontSize': '1rem'
              }
            },
            windowTitle: 'Details view for Invoice # ${rowData.id}',
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'PO Number', field: 'poNumber' },
        {
          title: 'Sales Order Number',
          field: 'isoNumber',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.id': ['data.id', 'query.id'],
              'rowData.quoteId': ['data.quoteId', 'query.quoteId'],
              'rowData.isoNumber': ['data.orderId', 'query.orderId'],
              'rowData.iso': ['data.iso', 'query.iso'],
              'rowData.documentIds': ['data.documentIds', 'query.documentIds'],
              'rowData.poNumber': ['data.poNumber', 'query.poNumber'],
              'rowData.orderDate': ['data.orderDate', 'query.orderDate'],
              'rowData.customer': ['data.customer', 'query.customer'],
              'rowData.client': ['data.client', 'query.client'],
              'rowData.orderStatus': ['data.orderStatus', 'query.orderStatus'],
              'rowData.currency': ['data.currency', 'query.currency'],
              'rowData.orderType': ['data.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['data.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['data.warehouseNote', 'query.warehouseNote'],
              'rowData.deliveryNote': ['data.deliveryNote', 'query.deliveryNote'],
              'rowData.salesTeam': ['data.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.isoNumber}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
                'fontSize': '1rem'
              }
            },
            windowTitle: 'Details view for Order # ${rowData.isoNumber}',
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        {
          title: 'Inv Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.value': 'value',
          },
        },
        { title: 'Quote Number', field: 'quoteId' },
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
        { title: 'Account Number', field: 'accountNumber' },
        { title: 'Customer', field: 'customer' },
        { title: 'Client', field: 'client' },
        // { title: 'Dispatches', field: 'dispatches' },
        { title: 'Client Rep Code', field: 'salesTeamId' },
        { title: 'PO Number', field: 'poNumber' },
        // { title: 'ISO Number', field: 'isoNumber' },

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
        'props.formContext.$formData.salesTeam': 'salesTeamId',
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.filter': 'filter',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.periodStart': 'periodStart',
        'props.formContext.$formData.periodEnd': 'periodEnd',
        'props.formContext.$formData.dateFilter': 'dateFilter',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'invoices.[].id': 'data.[].id',
        'invoices.[].invoiceDate': 'data.[].invoiceDate',
        'invoices.[].quoteDate': 'data.[].quoteDate',
        'invoices.[].quoteId': 'data.[].quoteId',
        'invoices.[].customer': 'data.[].customer',
        'invoices.[].client': 'data.[].client',
        'invoices.[].dispatches': 'data.[].dispatches',
        'invoices.[].accountNumber': 'data.[].accountNumber',
        'invoices.[].salesTeamId': 'data.[].salesTeamId',
        'invoices.[].poNumber': 'data.[].poNumber',
        'invoices.[].isoNumber': 'data.[].isoNumber',
        'invoices.[].value': 'data.[].value',
      },
    },
  }
};

const LasecCRMClienInvoiceActivities: Reactory.IReactoryForm = {
  id: 'LasecCRMClienInvoiceActivities',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Client Activities Invoices',
  tags: ['CMS Client Activities Invoices'],
  registerAsComponent: true,
  name: 'LasecCRMClienInvoiceActivities',
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

export default LasecCRMClienInvoiceActivities;
