import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'DELIVERY DETAILS',
  properties: {
    deliveryAddress: {
      type: 'string',
      title: 'Delivery Details'
    },
    deliveryNote: {
      type: 'string',
      title: 'Delivery Note'
    },
    warehouseNote: {
      type: 'string',
      title: 'Warehouse Note'
    },
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
    paddingBottom: '8px',
    marginBottom: '20px',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      deliveryAddress: { xs: 12 },
      deliveryNote: { xs: 12 },
      warehouseNote: { xs: 12 },
    },
  ],

  deliveryAddress: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Delivery Address',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  deliveryNote: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Delivery Note',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
  warehouseNote: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Warehouse Note',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '130px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    },
  },
};

const LasecCRMISODetailDeliveryDetails: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetailDeliveryDetails',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetailDeliveryDetails',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecCRMISODetailDeliveryDetails;
