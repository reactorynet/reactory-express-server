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
  dateFilter: {
    'ui:widget': 'DateSelectorWidget',
  },
  // client: {
  //   'ui:widget': 'LookupComponent',
  //   'ui:options': {
  //     label: 'Select a Client',
  //     title: 'Search for a Client'
  //   },
  //   props: {
  //     componentFqn: 'lasec-crm.LasecCRMClientLookupTable@1.0.0',
  //     componentProps: {},
  //   },
  // },
  // customer: {
  //   'ui:widget': 'LookupComponent',
  //   'ui:options': {
  //     label: 'Select a Customer',
  //     title: 'Search for a Customer',
  //     modalProps: {
  //       fullScreen: false,
  //       closeOnEvents: [
  //         'CloseModal:LasecCRMCustomerLookupTable'
  //       ]
  //     }
  //   },
  //   props: {
  //     componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
  //     componentProps: {},
  //     componentPropertyMap: {
  //       'LookupComponent.props.formContext.$formData': 'formData.selected',
  //       'LookupComponent.props.onChange': 'onCustomerSelect',
  //       'LookupComponent.props.formContext': 'LookupComponentFormContext',
  //     },
  //   },
  // },
  invoices: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Invoice Date',
          field: 'invoiceDate',
          width: '140px',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.invoiceDate ? api.utils.moment(rowData.invoiceDate).format(\'DD-MM-YYYY\') : ""}'
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
          width: '140px',
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
              variant: "body2",
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
                maxWidth: '140px'
              }
            },
            windowTitle: 'Details view for Invoice # ${rowData.id}',
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Invoices', '${rowData.id}'],
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } } }
            }
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'P.O. #', field: 'poNumber', breakpoint: 'sm', },
        {
          title: 'S.O. #',
          field: 'isoNumber',
          width: '140px',
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
              variant: "body2",
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
                maxWidth: '140px'
              }
            },
            windowTitle: 'Sales Order# ${rowData.isoNumber} - Detail View',
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Invoices', '${rowData.id}'],
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } } }
            }
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
        {
          title: 'Quote Number', field: 'quoteId',
          component: 'core.LabelComponent@1.0.0',
          breakpoint: 'sm',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.quoteId}'
              }
            },
          },
        },
        /*
        {
          title: 'Quote Date',
          field: 'quoteDate',
          component: 'core.LabelComponent@1.0.0',
          breakpoint: 'sm',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.quoteDate ? api.utils.moment(rowData.quoteDate).format(\'DD-MM-YYYY\') : ""}'
              }
            },
          },
          propsMap: {
            'rowData.quoteDate': 'value',
          }
        },
        */
        { title: 'Account Number', field: 'accountNumber', breakpoint: 'md', },
        { title: 'Customer', field: 'customer', breakpoint: 'md', },
        { title: 'Client', field: 'client', breakpoint: 'md', },
        // { title: 'Dispatches', field: 'dispatches' },
        { title: 'Client Rep Code', field: 'salesTeamId', breakpoint: 'md', },
        { title: 'GP %', field: 'gp', breakpoint: 'md', },
        { title: 'MUP %', field: 'mup', breakpoint: 'md', },
        // { title: 'ISO Number', field: 'isoNumber' },


      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        pageSize: 10
      },
      remoteData: true,
      query: 'invoices',
      componentMap: {
        Toolbar: 'lasec-crm.InvoiceGridToolbar@1.0.0'
      },
      variables: {
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
        'invoices.[].gp': 'data.[].gp',
        'invoices.[].mup': 'data.[].mup',
      },
    },
  }
};

export default uiSchema;
