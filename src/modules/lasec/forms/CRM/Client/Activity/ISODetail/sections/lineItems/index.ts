import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'PRODUCT SUMMARY',
  properties: {
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          line: {
            type: 'string'
          },
          productCode: {
            type: 'string'
          },
          productDescription: {
            type: 'string'
          },
          unitOfMeasure: {
            type: 'string'
          },
          price: {
            type: 'string'
          },
          totalPrice: {
            type: 'string'
          },
          orderQty: {
            type: 'string'
          },
          shippedQty: {
            type: 'string'
          },
          backOrderQty: {
            type: 'string'
          },
          reservedQty: {
            type: 'string'
          },
          comment: {
            type: 'string'
          },
        }
      },
      title: 'Line Items',
    }
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: 0,
      margin: 0,
    },
    style: {
      padding: 0,
      margin: 0,
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '8px',
    marginBottom: '20px',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      lineItems: { xs: 12 },
    },
  ],

  lineItems: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Stock Code', field: 'productCode' },
        { title: 'Product Description', field: 'productDescription' },
        { title: 'Unit of Measure', field: 'unitOfMeasure' },
        {
          title: 'Unit Price',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.price': 'value',
          },
        },
        {
          title: 'Total Price',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.totalPrice': 'value',
          },
        },
        { title: 'Order Qty', field: 'orderQty' },
        { title: 'Shipped Qty', field: 'shippedQty' },
        { title: 'Back Order', field: 'backOrderQty' },
        { title: 'Comment', field: 'comment' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: false,
    }
  }
};

const LasecCRMISODetailLineItems: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetailLineItems',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetailLineItems',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecCRMISODetailLineItems;
