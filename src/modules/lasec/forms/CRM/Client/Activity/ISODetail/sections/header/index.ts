import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    orderDate: {
      type: 'string',
      title: 'Order Date'
    },
    customer: {
      type: 'string',
      title: 'Customer'
    },
    client: {
      type: 'string',
      title: 'Client'
    },
    currency: {
      type: 'string',
      title: 'Currency'
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '1rem',
      margin: 0,
    },
    style: {
      margin: 0,
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      orderDate: { xs: 6, sm: 3 },
      customer: { xs: 6, sm: 3 },
      client: { xs: 6, sm: 3 },
      currency: { xs: 6, sm: 3 },
    },
  ],

  orderDate: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${api.utils.moment(formData).format("DD MMM YYYY")}',
      title: 'Order Date',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
          paddingLeft: '8px',
          paddingTop: '5px',
          fontSize: '1em'
        }
      },
      labelProps: {
        fontWeight: 'bold',
        marginTop: '0.5em',
        color: '#000000'
      },
    },
  },
  customer: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Customer',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
          paddingLeft: '8px',
          paddingTop: '5px',
          fontSize: '1em'
        }
      },
      labelProps: {
        fontWeight: 'bold',
        marginTop: '0.5em',
        color: '#000000'
      },
    },
  },
  client: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Client',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
          paddingLeft: '8px',
          paddingTop: '5px',
          fontSize: '1em'
        }
      },
      labelProps: {
        fontWeight: 'bold',
        marginTop: '0.5em',
        color: '#000000'
      },
    },
  },
  currency: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      title: 'Currency',
      variant: 'subtitle1',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
          paddingLeft: '8px',
          paddingTop: '5px',
          fontSize: '1em'
        }
      },
      labelProps: {
        fontWeight: 'bold',
        marginTop: '0.5em',
        color: '#000000'
      },
    },
  },

};

const LasecCRMISODetailHeader: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetailHeader',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetailHeader',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecCRMISODetailHeader;
