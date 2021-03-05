import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  title: 'PRODUCT SUMMARY',
  type: 'object',
  properties: {
    products: {
      type: 'array',
      title: 'Products',
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
          image: {
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
    toolbarPosition: 'none',
    containerStyles: {
      padding: 0,
      margin: 0,
    },
    style: {
      margin: 0,
      padding: 0
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 36px'
    }
  },
  'ui:grid-layout': [
    {
      products: { xs: 12 },
      style: { padding: '24px 32px' }
    },
  ],
  products: {
    'ui:widget': 'SalesOrdersProductSummary',
    'ui:options': {}
  },
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
  defaultFormValue: [],
  widgetMap: [
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'lasec-crm.SalesOrdersProductSummary@1.0.0', widget: 'SalesOrdersProductSummary' },
  ],
};

export default LasecCRMISODetailLineItems;
