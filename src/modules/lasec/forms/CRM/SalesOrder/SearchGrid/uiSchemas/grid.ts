import { FilterByOptions, FilterOptions } from '../shared';

const uiSchema: any = {
  'ui:options': {
    submitIcon: 'search',
    componentType: "form",
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      marginTop: '16px'
    },
    style: {
      marginTop: '16px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      salesOrders: {
        xs: 12, sm: 12, md: 12, lg: 12
      }
    }
  ],
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
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  submit: {
    'ui:widget': 'FormSubmitWidget',
    'ui:options': {
      text: 'SEARCH',
      color: 'default',
      props: {
        color: 'default',
        style: {
          maxWidth: '180px',
          width: '180px'
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
  orderStatus: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: FilterOptions,
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
  client: {
    'ui:widget': 'ClientFilter',
    'ui:options': {
      label: 'Select a Client',
      title: 'Search for a Client'
    },
    props: {
      componentFqn: 'lasec-crm.ClientFilter@1.0.0',
      componentProps: {},
    },
  },
  customer: {
    'ui:widget': 'CustomerFilter',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer'
    },
    props: {
      label: 'Select a Customer',
      //componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      //componentProps: {},
    },
  },
  salesOrders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Order Type', field: 'orderType' },
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
            'rowData.date': 'value',
          }
        },
        {
          title: 'Shipping Date',
          field: 'shippingDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${api.utils.moment(rowData.shippingDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        {
          title: 'ISO Number',
          field: 'salesOrderNumber',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.quoteId': ['formData.quoteId', 'query.quoteId'],
              'rowData.salesOrderNumber': ['formData.orderId', 'query.orderId'],
              'rowData.poNumber': ['formData.poNumber', 'query.poNumber'],
              'rowData.orderDate': [ 'formData.orderDate', 'query.orderDate'],
              'rowData.customer': ['formData.customer', 'query.customer'],
              'rowData.client': ['formData.header.client', 'query.client'],
              'rowData.orderStatus': ['formData.orderStatus',  'query.orderStatus'],
              'rowData.currency': ['formData.currency',  'query.currency'],
              'rowData.orderType': ['formData.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['formData.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['formData.warehouseNote',  'query.warehouseNote'],
              'rowData.deliveryNote': ['formData.deliveryNote',  'query.deliveryNote'],
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
              backNavigationItems: ['Sales Orders', '${rowData.salesOrderNumber}'],
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } }}
            }
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'Purchase Order Number', field: 'poNumber' },
        {
          title: 'Quote Number',
          field: 'quoteId',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.QuoteDetail@1.0.0',
            componentProps: {
              'rowData.quoteId': ['data.quote_id', 'data.code', 'query.quote_id']
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.quoteId}',
            windowTitle: 'Details view for ${rowData.quoteId}',
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body1',
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Sales Orders', 'Quote', '${rowData.quoteId}'],
              containerProps: { PaperProps: { style: { background: '#FFFFFF' } }}
            }
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        {
          title: 'Customer',
          field: 'customer',
          component: 'lasec-crm.CustomerLabel@1.0.0',
          props: {
            context: 'sales-order-grid'
          },
          propsMap: {
            'rowData.crmCustomer': 'customer',
            'rowData': 'data',
          }

        },
        { title: 'Client', field: 'client' },
        { title: 'Client Rep Code', field: 'salesTeam' },
        {
          title: 'Order Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.value': 'value',
          },
        },
        {
          title: 'Reserve Value',
          field: 'reserveValue',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.reserveValue': 'value',
          },
        },
        {
          title: 'Shipped Value',
          field: 'shipValue',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.shipValue': 'value',
          },
        },
        {
          title: 'Back Order Value',
          field: 'backorderValue',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.backorderValue': 'value',
          },
        },
      ],
      actions: [
        {
          icon: 'remove_circle',
          tooltip: 'Deactivate Client(s)',
          iconProps: {
            color: 'error'
          },
          mutation: 'deactivate',
          variables: {

          },
          resultMap: {

          },
          resultAction: 'refresh'
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1,
        pageSize: 10,
      },
      remoteData: true,
      query: 'query',
      componentMap: {
        Toolbar: 'lasec-crm.SalesOrderGridToolbar@1.0.0'
      },
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.customer': 'customer',
        'props.formContext.$formData.client': 'client',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.filter': 'filter',
        'props.formContext.$formData.orderStatus': 'orderStatus',
        'props.formContext.$formData.periodStart': 'periodStart',
        'props.formContext.$formData.periodEnd': 'periodEnd',
        'props.formContext.$formData.dateFilter': 'dateFilter',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'salesOrders.[].id': 'data.[].id',
        'salesOrders.[].salesOrderNumber': 'data.[].salesOrderNumber',
        'salesOrders.[].orderType': 'data.[].orderType',
        'salesOrders.[].orderStatus': 'data.[].orderStatus',
        'salesOrders.[].orderDate': 'data.[].orderDate',
        'salesOrders.[].shippingDate': 'data.[].shippingDate',
        'salesOrders.[].quoteDate': 'data.[].quoteDate',
        'salesOrders.[].iso': 'data.[].iso',
        'salesOrders.[].customer': 'data.[].customer',
        'salesOrders.[].crmCustomer': 'data.[].crmCustomer',
        'salesOrders.[].client': 'data.[].client',
        'salesOrders.[].poNumber': 'data.[].poNumber',
        'salesOrders.[].value': 'data.[].value',
        'salesOrders.[].reserveValue': 'data.[].reserveValue',
        'salesOrders.[].quoteId': 'data.[].quoteId',
        'salesOrders.[].currency': 'data.[].currency',
        'salesOrders.[].deliveryAddress': 'data.[].deliveryAddress',
        'salesOrders.[].warehouseNote': 'data.[].warehouseNote',
        'salesOrders.[].deliveryNote': 'data.[].deliveryNote',
        'salesOrders.[].salesTeam': 'data.[].salesTeam',
        'salesOrders.[].shipValue': 'data.[].shipValue',
        'salesOrders.[].backorderValue': 'data.[].backorderValue',
      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
