import { FilterByOptions } from '../shared';

const uiSchema: any = {
  'ui:options': {
    submitIcon: 'search',
    componentType: "form",
    showSubmit: true,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      search: { md: 4, sm: 12 },
      filterBy: { md: 4, sm: 12 },
      filter: { md: 4, sm: 12 },
    },
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
    /*
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData && formData.length > 3 ? "Searching for `" + formData + "`" : "Enter search keyword" }',
      variant: 'body1',
    }
    */
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
  salesOrders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        // { title: 'Sales Order Number', field: 'salesOrderNumber' },
        {
          title: 'Sales Order Number',
          field: 'quoteId',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.quoteId': ['data.quoteId', 'data.quoteId', 'query.quoteId'],
              'rowData.salesOrderNumber': ['data.orderId', 'data.orderId', 'query.orderId'],
              'rowData.poNumber': ['data.poNumber', 'data.poNumber', 'query.poNumber'],
              'rowData.orderDate': ['data.orderDate', 'data.orderDate', 'query.orderDate'],
              'rowData.customer': ['data.customer', 'data.customer', 'query.customer'],
              'rowData.client': ['data.client', 'data.client', 'query.client'],
              'rowData.orderStatus': ['data.orderStatus', 'data.orderStatus', 'query.orderStatus'],
              'rowData.currency': ['data.currency', 'data.currency', 'query.currency'],
              'rowData.orderType': ['data.orderType', 'data.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['data.deliveryAddress', 'data.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['data.warehouseNote', 'data.warehouseNote', 'query.warehouseNote'],
              'rowData.deliveryNote': ['data.deliveryNote', 'data.deliveryNote', 'query.deliveryNote'],
              'rowData.salesTeam': ['data.salesTeam', 'data.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.salesOrderNumber}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
            windowTitle: 'Details view for Order # ${rowData.salesOrderNumber}',
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
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
                variant: 'body2',
                format: '${api.utils.moment(rowData.shippingDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
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
        { title: 'Customer', field: 'customer' },
        { title: 'Client', field: 'client' },
        { title: 'Purchase Order Number', field: 'poNumber' },
        {
          title: 'Order Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.value': 'value',
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
        actionsColumnIndex: -1
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.filter': 'filter',
        'props.formContext.$formData.periodStart': 'periodStart',
        'props.formContext.$formData.periodEnd': 'periodEnd',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'salesOrders.[].id': 'data.[].id',
        'salesOrders.[].salesOrderNumber': 'data.[].salesOrderNumber',
        'salesOrders.[].orderDate': 'data.[].orderDate',
        'salesOrders.[].orderType': 'data.[].orderType',
        'salesOrders.[].orderStatus': 'data.[].orderStatus',
        'salesOrders.[].shippingDate': 'data.[].shippingDate',
        'salesOrders.[].iso': 'data.[].iso',
        'salesOrders.[].customer': 'data.[].customer',
        'salesOrders.[].client': 'data.[].client',
        'salesOrders.[].poNumber': 'data.[].poNumber',
        'salesOrders.[].value': 'data.[].value',
        'salesOrders.[].quoteId': 'data.[].quoteId',
        'salesOrders.[].currency': 'data.[].currency',
        'salesOrders.[].deliveryAddress': 'data.[].deliveryAddress',
        'salesOrders.[].warehouseNote': 'data.[].warehouseNote',
        'salesOrders.[].deliveryNote': 'data.[].deliveryNote',
        'salesOrders.[].salesTeam': 'data.[].salesTeam',
      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
