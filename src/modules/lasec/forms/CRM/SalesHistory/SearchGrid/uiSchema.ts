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
      salesHistory: { xs: 12, sm: 12, md: 12, lg: 12 }
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
        { title: 'Client Full Name', field: 'client' },
        { title: 'Invoice Number', field: 'invoiceNumber' },
        // { title: 'ISO No.', field: 'isoNumber' },
        {
          title: 'ISO No.',
          field: 'isoNumber',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.quoteId': ['formData.quoteId', 'query.quoteId'],
              'rowData.isoNumber': ['formData.orderId', 'query.orderId'],
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
            buttonTitle: '${rowData.isoNumber}',
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body1',
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
            windowTitle: 'Details view for Order # ${rowData.isoNumber}',
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Sales Order', '${rowData.isoNumber}'],
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
        search: true,
        showTitle: false,
        toolbar: true,
        selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1,
        pageSize: 10,
      },
      componentMap: {
        Toolbar: 'lasec-crm.SalesHistoryGridToolbar@1.0.0',
        DetailsPanel: 'lasec-crm.salesHistoryTableDetailPanel@1.0.0'
      },
      remoteData: true,
      query: 'sales_history',
      variables: {
        'query.id': 'clientId',
        'query.search': 'search',
        'query.filter': 'filter',
        'query.filterBy': 'filterBy',
        'query.year': 'year',
        'query.month': 'month',
        'query.years': 'years',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize',
        'query.periodStart': 'periodStart',
        'query.periodEnd': 'periodEnd',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'year': 'year',
        'month': 'month',
        'years': 'years',
        'salesHistory.[].id': 'data.[].id',
        'salesHistory.[].accountNumber': 'data.[].accountNumber',
        'salesHistory.[].invoiceNumber': 'data.[].invoiceNumber',
        'salesHistory.[].iso': 'data.[].isoNumber',

        'salesHistory.[].quoteId': 'data.[].quoteId', // check
        'salesHistory.[].salesOrderNumber': 'data.[].salesOrderNumber', // check

        'salesHistory.[].poNumber': 'data.[].poNumber',
        'salesHistory.[].orderDate': 'data.[].orderDate',
        'salesHistory.[].customer': 'data.[].customer',
        'salesHistory.[].client': 'data.[].client',

        'salesHistory.[].orderStatus': 'data.[].orderStatus', // check
        'salesHistory.[].currency': 'data.[].currency', // check
        'salesHistory.[].orderType': 'data.[].orderType', // check
        'salesHistory.[].deliveryAddress': 'data.[].deliveryAddress', // check
        'salesHistory.[].warehouseNote': 'data.[].warehouseNote', // check
        'salesHistory.[].deliveryNote': 'data.[].deliveryNote', // check
        'salesHistory.[].salesTeam': 'data.[].salesTeam', //check


      },
    },
  }
};

export default uiSchema;
