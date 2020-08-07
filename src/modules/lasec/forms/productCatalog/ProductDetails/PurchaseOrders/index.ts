import { Reactory } from '@reactory/server-core/types/reactory'

const graphql = {
  query: {
    name: 'LasecGetCRMPurchaseOrders',
    text: `query LasecGetCRMPurchaseOrders($productId: String, $paging: PagingRequest){
      LasecGetCRMPurchaseOrders(productId: $productId, paging: $paging){
        paging {
          total
          page
          hasNext
          pageSize
        }
        purchaseOrders {
          id
          dueDate
          entryDate
          lastUpdateDate
          poNumber
          shipInfo
          orderQuantity
          receiptedQuantity
        }
      }
    }`,
    variables: {
      'formData.id': 'productId',
      'formData.paging': 'paging'
    },
    resultMap: {
      'paging': 'paging',
      'purchaseOrders.[].id': 'purchaseOrders.[].id',
      'purchaseOrders.[].dueDate': 'purchaseOrders.[].dueDate',
      'purchaseOrders.[].entryDate': 'purchaseOrders.[].entryDate',
      'purchaseOrders.[].lastUpdateDate': 'purchaseOrders.[].lastUpdateDate',
      'purchaseOrders.[].poNumber': 'purchaseOrders.[].poNumber',
      'purchaseOrders.[].shipInfo': 'purchaseOrders.[].shipInfo',
      'purchaseOrders.[].orderQuantity': 'purchaseOrders.[].orderQuantity',
      'purchaseOrders.[].receiptedQuantity': 'purchaseOrders.[].receiptedQuantity',
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
    purchaseOrders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
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
      purchaseOrders: { xs: 12 }
    }
  ],
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
  purchaseOrders: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Entry Date',
          field: 'entryDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.entryDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.entryDate': 'value',
          }
        },
        {
          title: 'Due Date',
          field: 'dueDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.dueDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.dueDate': 'value',
          }
        },
        {
          title: 'Last Updates',
          field: 'lastUpdateDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.lastUpdateDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.lastUpdateDate': 'value',
          }
        },
        {
          title: 'Order Number',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCMSProductPurchaseOrderItemsTable@1.0.0',
            componentProps: {
              'rowData.poNumber': 'formData.orderId',
            },
            slideDirection: 'down',
            buttonVariant: 'Typography',
            buttonProps: {
              color: "#000000",
              style: { color: "#000000", textDecoration: 'underline' }
            },
            buttonTitle: '${rowData.poNumber}',
            windowTitle: 'Purchase Order',
          },
        },
        // { title: 'Order Number', field: 'poNumber' },
        { title: 'Ship Info', field: 'shipInfo' },
        { title: 'Order', field: 'orderQuantity' },
        { title: 'Rec', field: 'receiptedQuantity' },
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
        'purchaseOrders.[].id': 'data.[].id',
        'purchaseOrders.[].dueDate': 'data.[].dueDate',
        'purchaseOrders.[].entryDate': 'data.[].entryDate',
        'purchaseOrders.[].lastUpdateDate': 'data.[].lastUpdateDate',
        'purchaseOrders.[].poNumber': 'data.[].poNumber',
        'purchaseOrders.[].shipInfo': 'data.[].shipInfo',
        'purchaseOrders.[].orderQuantity': 'data.[].orderQuantity',
        'purchaseOrders.[].receiptedQuantity': 'data.[].receiptedQuantity',
      },
    },
  }
};

const LasecCMSProductPurchaseOrders: Reactory.IReactoryForm = {
  id: 'LasecCMSProductPurchaseOrdersTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Purchase Orders Table',
  tags: ['CMS Product Purchase Orders Table'],
  registerAsComponent: true,
  name: 'LasecCMSProductPurchaseOrdersTable',
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
    { componentFqn: 'core.LabelComponent@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageWidget' },
  ],
};

export default LasecCMSProductPurchaseOrders;
