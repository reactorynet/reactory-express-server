import { FilterByOptions, FilterOptions } from '../shared';

const uiSchema: any = {
  'ui:options': {
    submitIcon: 'search',
    componentType: 'form',
    showSubmit: false,
    showRefresh: false,
    container: 'div',
    containerStyles: {
      padding: '0px',
      marginTop: '16px',
    },
    style: {
      marginTop: '16px',
    },
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      salesOrders: {
        xs: 12, sm: 12, md: 12, lg: 12,
      },
    },
  ],
  salesOrders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Order Type',
          field: 'orderType',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${formData}',
              },
            },
          },
          propsMap: {
            'rowData.orderType': 'formData',
          },
        },
        {
          title: 'Order Date',
          field: 'orderDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.orderDate).format(\'DD MMM YYYY\')}', // eslint-disable-line
              },
            },
          },
          propsMap: {
            'rowData.date': 'value',
          },
        },
        {
          title: 'Shipping Date',
          field: 'shippingDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.shippingDate).format(\'DD MMM YYYY\')}', // eslint-disable-line
              },
            },
          },
          propsMap: {
            'rowData.date': 'value',
          },
        },
        {
          title: 'ISO Number',
          field: 'salesOrderNumber',
          component: 'lasec-crm.SalesOrderActionButton',
          propsMap: {
            'rowData.salesOrderNumber': 'sales_order_number',
            'rowData.quoteId': 'quote_id',
          },
        },
        {
          title: 'Purchase Order Number',
          field: 'poNumber',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${formData}',
              },
            },
          },
          propsMap: {
            'rowData.poNumber': 'formData',
          },
        },
        {
          title: 'Quote Number',
          field: 'quoteId',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.QuoteForm@1.0.0',
            componentProps: {
              'rowData.quoteId': ['quote_id'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.quoteId}',
            windowTitle: 'Details view for ${rowData.quoteId}',
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body2',
              style: {
                textDecoration: 'underline',
                cursor: 'pointer',
              },
            },
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Sales Orders', 'Quote', '${rowData.quoteId}'],
            },
          },
          propsMap: {
            rowData: 'rowData',
          },
        },
        {
          title: 'Customer',
          field: 'customer',
          component: 'lasec-crm.CustomerLabel@1.0.0',
          props: {
            context: 'sales-order-grid',
            uiSchema: {
              'ui:options': {
                displayField: 'registeredName',
              },
            },

          },
          propsMap: {
            'rowData.crmCustomer': 'customer',
            rowData: 'data',
          },

        },
        {
          title: 'Client',
          field: 'client',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${formData}',
              },
            },
          },
          propsMap: {
            'rowData.client': 'formData',
          },
        },
        {
          title: 'Client Rep Code',
          field: 'salesTeam',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${data.salesTeam}',
              },
            },
          },
          propsMap: {
            rowData: 'data',
          },
        },
        {
          title: 'Order Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            style: {
              fontSize: '0.75rem',
            },
          },
          propsMap: {
            'rowData.value': 'value',
          },
        },
        {
          title: 'Reserve Value',
          field: 'reserveValue',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            style: {
              fontSize: '0.75rem',
            },
          },
          propsMap: {
            'rowData.reserveValue': 'value',
          },
        },
        {
          title: 'Shipped Value',
          field: 'shipValue',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            style: {
              fontSize: '0.75rem',
            },
          },
          propsMap: {
            'rowData.shipValue': 'value',
          },
        },
        {
          title: 'Back Order Value',
          field: 'backorderValue',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            style: {
              fontSize: '0.75rem',
            },
          },
          propsMap: {
            'rowData.backorderValue': 'value',
          },
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        selection: false,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1,
        pageSize: 10,
      },
      remoteData: true,
      query: 'sales_orders',
      componentMap: {
        Toolbar: 'lasec-crm.SalesOrderGridToolbar@1.0.0',
      },
      variables: {
        'query.search': 'search',
        'query.customer': 'customer',
        'query.client': 'client',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize',
        'query.filterBy': 'filterBy',
        'query.filter': 'filter',
        'query.orderStatus': 'orderStatus',
        'query.periodStart': 'periodStart',
        'query.periodEnd': 'periodEnd',
        'query.dateFilter': 'dateFilter',
        'query.orderBy.field': 'orderBy',
        'query.orderDirection': 'orderDirection',
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
  },
};

export default uiSchema;
