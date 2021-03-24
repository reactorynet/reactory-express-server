import { Reactory } from '@reactory/server-core/types/reactory'

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetCRMSalesOrders',
    text: `query LasecGetCRMSalesOrders($productId: String, $image: String, $code: String, $description: String, $unitOfMeasure: String, $price: Int, $paging: PagingRequest){
      LasecGetCRMSalesOrders(productId: $productId, image: $image, code: $code, description: $description, unitOfMeasure: $unitOfMeasure, price: $price, paging: $paging){
        paging {
          total
          page
          hasNext
          pageSize
        }
        totals
        id
        image
        code
        description
        unitOfMeasure
        price
        salesOrders {
          id
          orderDate
          salesOrderNumber,
          shippingDate
          quoteId
          quoteDate
          orderType
          orderStatus
          iso
          customer
          client
          poNumber
          currency
          value
          deliveryAddress
          warehouseNote
          deliveryNote
          salesTeam
          reserveValue
          shipValue
          backorderValue
          dispatchCount
          invoiceCount

          orderQty
          shipQty
          reservedQty
          backOrderQty
        }
      }
    }`,
    autoQuery: false,
    resultType: 'object',
    edit: false,
    new: false,
    variables: {
      'formData.id': 'productId',
      'formData.paging': 'paging',
      'formData.image': 'image',
      'formData.code': 'code',
      'formData.description': 'description',
      'formData.unitOfMeasure': 'unitOfMeasure',
      'formData.price': 'price',
    },
    resultMap: {
      'paging': 'paging',
      'totals': 'totals',
      'salesOrders': 'salesOrders',
      'id': ['id', 'product'],
      'image': 'image',
      'code': 'code',
      'description': 'description',
      'unitOfMeasure': 'unitofMeasure',
      'price': 'price'
    },
  },
  queries: {
    sales_orders: {
      name: 'LasecGetCRMSalesOrders',
      text: `query LasecGetCRMSalesOrders($productId: String, $image: String, $code: String, $description: String, $unitOfMeasure: String, $price: Int, $paging: PagingRequest){
      LasecGetCRMSalesOrders(productId: $productId, image: $image, code: $code, description: $description, unitOfMeasure: $unitOfMeasure, price: $price, paging: $paging){
        paging {
          total
          page
          hasNext
          pageSize
        }
        totals
        id
        image
        code
        description
        unitOfMeasure
        price
        salesOrders {
          id
          orderDate
          salesOrderNumber,
          shippingDate
          quoteId
          quoteDate
          orderType
          orderStatus
          iso
          customer
          client
          poNumber
          currency
          value
          deliveryAddress
          warehouseNote
          deliveryNote
          salesTeam
          reserveValue
          shipValue
          backorderValue
          dispatchCount
          invoiceCount

          orderQty
          shipQty
          reservedQty
          backOrderQty
        }
      }
    }`,
      autoQuery: false,
      resultType: 'object',
      edit: false,
      new: false,
      variables: {
        'formData.id': 'productId',
        'formData.paging': 'paging',
        'formData.image': 'image',
        'formData.code': 'code',
        'formData.description': 'description',
        'formData.unitOfMeasure': 'unitOfMeasure',
        'formData.price': 'price',
      },
      resultMap: {
        'paging': 'paging',
        'totals': 'totals',
        'salesOrders': 'salesOrders',
        'id': ['id', 'product'],
        'image': 'image',
        'code': 'code',
        'description': 'description',
        'unitOfMeasure': 'unitofMeasure',
        'price': 'price'
      },
    },
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    product: {
      type: 'string',
    },
    image: {
      type: 'string',
    },
    code: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    unitOfMeasure: {
      type: 'string',
    },
    price: {
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
          orderStatus: {
            type: 'string'
          },
          shippingDate: {
            type: 'string'
          },
          iso: {
            type: 'string'
          },
          quoteId: {
            type: 'string'
          },
          quoteDate: {
            type: 'string'
          },
          dispatchCount: {
            type: 'number',
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


          orderQty: {
            type: 'string'
          },
          shipQty: {
            type: 'string'
          },
          reservedQty: {
            type: 'string'
          },
          backOrderQty: {
            type: 'string'
          },

        },
      },
    },
  },
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
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      image: { xs: 2 },
      code: { xs: 6, sm: 4, md: 2 },
      description: { xs: 12, sm: 4, md: 4 },
      unitOfMeasure: { xs: 6, md: 2 },
      price: { xs: 6, md: 2 },
    },
    {
      salesOrders: { xs: 12, lg: 12 }
    }
  ],
  id: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  image: {
    'ui:widget': 'ImageWidget',
    props: {
      'ui:options': {
        variant: 'rounded',
        style: {
          marginLeft: '16px'
        }
      },
    },
    propsMap: {
      'formData.image': 'value',
    },
  },
  code: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'body2',
      title: 'Stock Code',
      titleProps: {
        style: {
          display: 'content',
          color: "#a8a8a8",
          fontSize: "0.7rem",
        }
      },
      bodyProps: {
        style: {
          fontSize: "0.9rem"
        }
      },
    },
  },
  description: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'body2',
      title: 'Description',
      titleProps: {
        style: {
          display: 'content',
          color: "#a8a8a8",
          fontSize: "0.7rem",
        }
      },
      bodyProps: {
        style: {
          fontSize: "0.9rem"
        }
      },
    },
  },
  unitOfMeasure: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'body2',
      title: 'Unit of Measure',
      icon: 'square_foot',
      iconPosition: 'inline',
      titleProps: {
        style: {
          display: 'content',
          color: "#a8a8a8",
          fontSize: "0.7rem",
        }
      },
      bodyProps: {
        style: {
          fontSize: "0.9rem"
        }
      },
    },
  },
  price: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '<strong>From:</strong> R ${ ((formData * 1) / 100 ).toFixed(2)}',
      variant: 'body2',
      renderHtml: true,
      title: 'Stock Price',
      titleProps: {
        style: {
          display: 'content',
          color: "#a8a8a8",
          fontSize: "0.7rem",
        }
      },
      bodyProps: {
        style: {
          fontSize: "0.9rem"
        }
      },
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
                format: '${rowData.orderDate != "" ? api.utils.moment(rowData.orderDate).format(\'DD MMM YYYY\'): ""}'
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
                format: '${rowData.shippingDate != "" ? api.utils.moment(rowData.shippingDate).format(\'DD MMM YYYY\'): ""}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        { title: 'ISO Number', field: 'id' },
        { title: 'Quote', field: 'quoteId' },
        {
          title: 'Quote Date',
          field: 'quoteDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${rowData.quoteDate != "" ? api.utils.moment(rowData.quoteDate).format(\'DD MMM YYYY\'): ""}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        { title: 'Customer', field: 'customer' },
        { title: 'Client', field: 'client' },
        { title: 'Purchase Order Number', field: 'poNumber' },
        { title: 'Order', field: 'orderQty' },
        { title: 'Ship', field: 'shipQty' },
        { title: 'Res.', field: 'reservedQty' },
        { title: 'BO.', field: 'backOrderQty' },
        {
          title: 'Order Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            region: 'en-ZA',
            currency: 'ZAR'
          },
          propsMap: {
            'rowData.value': 'value',
          },
        },
        { title: 'Status', field: 'orderStatus' },
      ],
      footerColumns: [
        { field: 'orderType' }, { field: 'orderDate' }, { field: 'shippingDate' }, { field: 'id' }, { field: 'quoteId' }, { field: 'quoteDate' }, { field: 'customer' }, { field: 'client' },
        { field: 'poNumber', text: 'Totals' },
        { field: 'orderQty', value: '${totals.orderQty}' },
        { field: 'shipQty', value: '${totals.shipQty}' },
        { field: 'reservedQty', value: '${totals.reservedQty}' },
        { field: 'backOrderQty', value: '${totals.backOrderQty}' },
        { field: 'value' }, { field: 'orderStatus' }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        showFooter: true,
        searchText: '${formContext.$formData.product}'
      },
      remoteData: true,
      query: 'query',
      variables: {
        'formContext.$formData.id': 'productId',
        'formContext.$formData.image': 'image',
        'formContext.$formData.code': 'code',
        'formContext.$formData.description': 'description',
        'formContext.$formData.unitOfMeasure': 'unitOfMeasure',
        'formContext.$formData.price': 'price',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'totals': 'totals',
        'salesOrders': 'data',
        'id': 'id',
        'image': 'image',
        'code': 'code',
        'description': 'description',
        'unitOfMeasure': 'unitofMeasure',
        'price': 'price'
      },
    },
  }
};

const GridOnlyUISchema: any = {
  'ui:options': {
    componentType: 'div',
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
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
    style: {
      overflowY: 'hidden',
    },
  },
  'ui:grid-layout': [
    {
      salesOrders: { xs: 12 },
    },
  ],
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
        { title: 'ISO Number', field: 'id' },
        { title: 'Quote', field: 'quoteId' },
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
        { title: 'Customer', field: 'customer' },
        { title: 'Client', field: 'client' },
        { title: 'Purchase Order Number', field: 'poNumber' },

        { title: 'Order', field: 'orderQty' },
        { title: 'Ship', field: 'shipQty' },
        { title: 'Res.', field: 'reservedQty' },
        { title: 'BO.', field: 'backOrderQty' },

        {
          title: 'Order Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          props: {
            region: 'en-ZA',
            currency: 'ZAR'
          },
          propsMap: {
            'rowData.value': 'value',
          },
        },

        { title: 'Status', field: 'orderStatus' },

      ],
      footerColumns: [
        { field: 'orderType' }, { field: 'orderDate' }, { field: 'shippingDate' }, { field: 'id' }, { field: 'quoteId' }, { field: 'quoteDate' }, { field: 'customer' }, { field: 'client' },
        { field: 'poNumber', text: 'Totals' },
        { field: 'totals.orderQty', value: '${totals.orderQty}' },
        { field: 'shipQty', value: '${totals.shipQty}' },
        { field: 'reservedQty', value: '${totals.reservedQty}' },
        { field: 'backOrderQty', value: '${totals.backOrderQty}' },
        { field: 'value' }, { field: 'orderStatus' }
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
        'formContext.formData.id': 'productId',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',

        'totals': 'totals',

        'salesOrders.[].id': 'data.[].id',
        'salesOrders.[].orderDate': 'data.[].orderDate',
        'salesOrders.[].orderType': 'data.[].orderType',
        'salesOrders.[].quoteId': 'data.[].quoteId',
        'salesOrders.[].quoteDate': 'data.[].quoteDate',
        'salesOrders.[].dispatchCount': 'data.[].dispatchCount',
        'salesOrders.[].shippingDate': 'data.[].shippingDate',
        'salesOrders.[].iso': 'data.[].iso',
        'salesOrders.[].customer': 'data.[].customer',
        'salesOrders.[].client': 'data.[].client',
        'salesOrders.[].poNumber': 'data.[].poNumber',
        'salesOrders.[].value': 'data.[].value',

        'salesOrders.[].orderStatus': 'data.[].orderStatus',
        'salesOrders.[].orderQty': 'data.[].orderQty',
        'salesOrders.[].shipQty': 'data.[].shipQty',
        'salesOrders.[].reservedQty': 'data.[].reservedQty',
        'salesOrders.[].backOrderQty': 'data.[].backOrderQty',
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
  schema,
  graphql,
  uiSchema,
  uiSchemas: [
    {
      id: 'default',
      key: 'default',
      description: 'Default SALES PRODUCT SALES ORDER VIEW',
      icon: 'view_quilt',
      title: 'Default View',
      uiSchema,
    },
    {
      id: 'grid_only',
      key: 'grid_only',
      description: 'GRID ONLY SALES PRODUCT SALES ORDER VIEW',
      icon: 'view_quilt',
      title: 'Grid Only',
      uiSchema: GridOnlyUISchema,
    }
  ],
  widgetMap: [
    { componentFqn: 'core.LabelComponent@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageWidget' },
  ],
};

export default LasecCMSProductSalesOrders;
