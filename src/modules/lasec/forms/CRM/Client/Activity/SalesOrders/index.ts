import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from './graphql';
import $schema from './schema';
import { SalesOrdersFilterByOptions } from '../shared';

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
      salesOrders: { xs: 12 }
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
      selectOptions: SalesOrdersFilterByOptions,
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
  // customer: {
  //   'ui:widget': 'LookupComponent',
  //   'ui:options': {
  //     label: 'Select a Customer',
  //     title: 'Search for a Customer'
  //   },
  //   props: {
  //     componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
  //     componentProps: {},
  //   },
  // },
  customer: {
    'ui:widget': 'CustomerLookupComponent',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMClientActivityCustomerLookupTable@1.0.0',
      componentProps: {},
      componentPropertyMap: {
        'LookupComponent.props.onChange': 'onCustomerSelect',
        // 'LookupComponent.props.formContext.$formData': 'formData.selected',
        // 'LookupComponent.props.formContext': 'LookupComponentFormContext',
      },
    },
  },

  salesOrders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Order Type', field: 'orderType' },
        { title: 'Order Status', field: 'orderStatus' },
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
          title: 'Quote Date',
          field: 'quoteDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${api.utils.moment(rowData.quoteDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        {
          title: 'Sales Order Number',
          field: 'salesOrderNumber',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              // 'rowData.id': ['data.id', 'query.id'],
              // 'rowData.quoteId': ['data.quoteId', 'query.quoteId'],
              'rowData.salesOrderNumber': ['formData.orderSummary.orderId', 'formData.orderId'],
              // 'rowData.iso': ['data.iso', 'query.iso'],
              // 'rowData.documentIds': ['data.documentIds', 'query.documentIds'],
              // 'rowData.poNumber': ['data.poNumber', 'query.poNumber'],
              // 'rowData.orderDate': ['data.orderDate', 'query.orderDate'],
              // 'rowData.customer': ['data.customer', 'query.customer'],
              // 'rowData.client': ['data.client', 'query.client'],
              // 'rowData.orderStatus': ['data.orderStatus', 'query.orderStatus'],
              // 'rowData.currency': ['data.currency', 'query.currency'],
              // 'rowData.orderType': ['data.orderType', 'query.orderType'],
              // 'rowData.deliveryAddress': ['data.deliveryAddress', 'query.deliveryAddress'],
              // 'rowData.warehouseNote': ['data.warehouseNote', 'query.warehouseNote'],
              // 'rowData.deliveryNote': ['data.deliveryNote', 'query.deliveryNote'],
              // 'rowData.salesTeam': ['data.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.salesOrderNumber}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
                'fontSize': '1rem'
              }
            },
            windowTitle: 'Details view for Order # ${rowData.salesOrderNumber}',
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Sales Order', '${rowData.salesOrderNumber}'],
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
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
                'fontSize': '1rem'
              }
            },
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Quote', '${rowData.quoteId}'],
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } }}
            }
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'Customer', field: 'customer' },
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
          title: 'Ship Value',
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
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
      },
      componentMap: {
        Toolbar: 'lasec-crm.SalesOrderGridToolbar@1.0.0',
      },
      toobarPropsMap: {
        'formContext.formData.id': 'query.id',
        'formContext.formData.search': 'query.search',
        'formContext.formData.filterBy': 'query.filterBy',
        'formContext.formData.filter': 'query.filter',
        'toolbarProps.use_case': 'use_case',
      },
      toolbarProps: {
        filterBy: 'client_id',
        use_case: 'client_activity',
      },
      remoteData: true,
      query: 'client_sales_orders',
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
        'salesOrders.[].id': 'data.[].id',
        'salesOrders.[].salesOrderNumber': 'data.[].salesOrderNumber',
        'salesOrders.[].orderDate': 'data.[].orderDate',
        'salesOrders.[].shippingDate': 'data.[].shippingDate',
        'salesOrders.[].quoteDate': 'data.[].quoteDate',
        'salesOrders.[].orderType': 'data.[].orderType',
        'salesOrders.[].orderStatus': 'data.[].orderStatus',
        'salesOrders.[].iso': 'data.[].iso',
        'salesOrders.[].customer': 'data.[].customer',
        'salesOrders.[].client': 'data.[].client',
        'salesOrders.[].poNumber': 'data.[].poNumber',
        'salesOrders.[].quoteId': 'data.[].quoteId',
        'salesOrders.[].currency': 'data.[].currency',
        'salesOrders.[].deliveryAddress': 'data.[].deliveryAddress',
        'salesOrders.[].warehouseNote': 'data.[].warehouseNote',
        'salesOrders.[].deliveryNote': 'data.[].deliveryNote',
        'salesOrders.[].salesTeam': 'data.[].salesTeam',
        'salesOrders.[].value': 'data.[].value',
        'salesOrders.[].reserveValue': 'data.[].reserveValue',
        'salesOrders.[].shipValue': 'data.[].shipValue',
        'salesOrders.[].backorderValue': 'data.[].backorderValue',
        'salesOrders.[].documentIds': 'data.[].documentIds',
      },
    },
  }
};

const LasecCRMClientSalesOrderActivities: Reactory.IReactoryForm = {
  id: 'LasecCRMClientSalesOrderActivities',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Client Activities Quotes',
  tags: ['CMS Client Activities Quotes'],
  registerAsComponent: true,
  name: 'LasecCRMClientSalesOrderActivities',
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
    { componentFqn: 'lasec-crm.CustomerLookupModal@1.0.0', widget: 'CustomerLookupComponent' }
  ],
};

export default LasecCRMClientSalesOrderActivities;
