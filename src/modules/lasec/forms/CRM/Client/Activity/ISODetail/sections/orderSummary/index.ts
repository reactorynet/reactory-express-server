import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'ORDER SUMMARY',
  properties: {
    orderId: {
      type: 'string',
      title: 'Sales Order Number'
    },
    orderType: {
      type: 'string',
      title: 'Order Type'
    },
    poNumber: {
      type: 'string',
      title: 'Purchase Order Number'
    },
    salesPerson: {
      type: 'string',
      title: 'Sales Person'
    },
    quoteNumber: {
      type: 'string',
      title: 'Quote Number'
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
      orderId: { xs: 12 },
      orderType: { xs: 12 },
      poNumber: { xs: 12 },
      salesPerson: { xs: 12 },
      quoteNumber: { xs: 12 },
    },
  ],

  orderId: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Sales Order No.',
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
  orderType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Order Type',
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
  poNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Purchase Order No.',
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
  salesPerson: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Sales Person',
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
  quoteNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Quote No.',
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

const LasecCRMISODetailOrderSummary: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetailOrderSummary',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetailOrderSummary',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecCRMISODetailOrderSummary;
