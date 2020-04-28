import { Reactory } from '@reactory/server-core/types/reactory'
// import $uiSchema from './uiSchema';
// import $graphql from './graphql';

const graphql = {
  query: {
    name: 'LasecGetCRMSalesOrders',
    text: `query LasecGetCRMSalesOrders($productId: String, $paging: PagingRequest){
      LasecGetCRMSalesOrders(productId: $productId, paging: $paging){
        paging {
          total
          page
          hasNext
          pageSize
        }
        salesOrders {
          id
          orderDate
          orderType
          shippingDate
          iso
          customer
          client
          poNumber
          value
        }
      }
    }`,
    variables: {
      'formData.id': 'productId',
      'formData.paging': 'paging'
    },
    resultMap: {
      'paging': 'paging',
      'salesOrders.[].id': 'salesOrders.[].id',
      'salesOrders.[].orderDate': 'salesOrders.[].orderDate',
      'salesOrders.[].orderType': 'salesOrders.[].orderType',
      'salesOrders.[].shippingDate': 'salesOrders.[].shippingDate',
      'salesOrders.[].iso': 'salesOrders.[].iso',
      'salesOrders.[].customer': 'salesOrders.[].customer',
      'salesOrders.[].client': 'salesOrders.[].client',
      'salesOrders.[].poNumber': 'salesOrders.[].poNumber',
      'salesOrders.[].value': 'salesOrders.[].value',
    },
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    product: {
      type: 'string',
    },
    salesOrders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          orderDate: {
            type: 'string'
          },
          orderType: {
            type: 'string'
          },
          shippingDate: {
            type: 'string'
          },
          iso: {
            type: 'string'
          },
          customer: {
            type: 'string'
          },
          client: {
            type: 'string'
          },
          poNumber: {
            type: 'string'
          },
          value: {
            type: 'string'
          },
        }
      },
    }
  }

};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      // paddingBottom: '8px'
    },
    style: {
      // marginTop: '16px',
    },
  },
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
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
        { title: 'ISO Number', field: 'id' },
        { title: 'Customer', field: 'customer' },
        { title: 'Client', field: 'client' },
        { title: 'Purchase Order Number', field: 'poNumber' },
        { title: 'Order Value', field: 'value' },
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
        'props.formContext.$formData.id': 'productId'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'salesOrders.[].id': 'data.[].id',
        'salesOrders.[].orderDate': 'data.[].orderDate',
        'salesOrders.[].orderType': 'data.[].orderType',
        'salesOrders.[].shippingDate': 'data.[].shippingDate',
        'salesOrders.[].iso': 'data.[].iso',
        'salesOrders.[].customer': 'data.[].customer',
        'salesOrders.[].client': 'data.[].client',
        'salesOrders.[].poNumber': 'data.[].poNumber',
        'salesOrders.[].value': 'data.[].value',
      },
    },
  }
};

const LasecCMSProductSalesOrders: Reactory.IReactoryForm = {
  id: 'LasecCMSProductSalesOrdersTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Sales Orders',
  tags: ['CMS Product Sales Orders'],
  registerAsComponent: true,
  name: 'LasecCMSProductSalesOrdersTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql: graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    product: "",
    products: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
  ],
};

export default LasecCMSProductSalesOrders;
