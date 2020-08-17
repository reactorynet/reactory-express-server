import { Reactory } from '@reactory/server-core/types/reactory'
import { stubFalse } from 'lodash';

const graphql = {
  query: {
    name: 'LasecGetCRMPurchaseOrderDetail',
    text: `query LasecGetCRMPurchaseOrderDetail($orderId: String!){
      LasecGetCRMPurchaseOrderDetail(orderId: $orderId){
        code
        description
        orderQty
        etaDate
      }
    }`,
    variables: {
      'formData.orderId': 'orderId',
    },
    resultMap: {
      '[].code': 'purchaseOrderItems.[].code',
      '[].description': 'purchaseOrderItems.[].description',
      '[].orderQty': 'purchaseOrderItems.[].orderQty',
      '[].etaDate': 'purchaseOrderItems.[].etaDate',
    },
    autoQuery: true,
    resultType: 'array',
    edit: false,
    new: false,
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    orderId: {
      type: 'string',
    },
    purchaseOrderItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          orderQty: {
            type: 'string'
          },
          etaDate: {
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
      purchaseOrderItems: { xs: 12 }
    }
  ],
  orderId: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  purchaseOrderItems: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Stock Code', field: 'code' },
        { title: 'Description', field: 'description' },
        { title: 'Qty Order', field: 'orderQty' },
        {
          title: 'ETA',
          field: 'etaDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.etaDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.etaDate': 'value',
          }
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: false,
    },
  }
};

const LasecCMSProductPurchaseOrderItems: Reactory.IReactoryForm = {
  id: 'LasecCMSProductPurchaseOrderItemsTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Purchase Orders Table',
  tags: ['CMS Product Purchase Orders Table'],
  registerAsComponent: true,
  name: 'LasecCMSProductPurchaseOrderItemsTable',
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

export default LasecCMSProductPurchaseOrderItems;
