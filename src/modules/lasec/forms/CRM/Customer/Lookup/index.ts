import { Reactory } from '@reactory/server-core/types/reactory'

export const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      customerName: { sm: 4 },
    },
    {
      organizationName: { sm: 4 },
    },
  ],
  customerName: {},
  // customerName: {
  //   'ui:widget': 'SlideOutLauncher',
  //   'ui:options': {},
  //   props: {
  //     componentFqn: 'lasec-crm.UpdateQuoteStatus@1.0.0',
  //     componentProps: {
  //       'code': ['data.quote_id', 'data.code', 'query.quote_id']
  //     },
  //     slideDirection: 'down',
  //     buttonTitle: 'Next Actions',
  //     windowTitle: 'Next Actions ${code}',
  //   },
  // },
  organizationName: {},
};



const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      customerName: { sm: 4 },
    },
    {
      organizationName: { sm: 4 },
    },
  ],
  customerName: {},
  // customerName: {
  //   'ui:widget': 'SlideOutLauncher',
  //   'ui:options': {},
  //   props: {
  //     componentFqn: 'lasec-crm.UpdateQuoteStatus@1.0.0',
  //     componentProps: {
  //       'code': ['data.quote_id', 'data.code', 'query.quote_id']
  //     },
  //     slideDirection: 'down',
  //     buttonTitle: 'Next Actions',
  //     windowTitle: 'Next Actions ${code}',
  //   },
  // },
  organizationName: {},
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    customerName: {
      title: 'Select a Customer',
      type: 'string'
    },
    organizationName: {
      title: 'Select an Organisation',
      type: 'string'
    },
  }
};

const LasecCRMCustomerLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMCustomerLookup',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Customer Lookup',
  tags: ['CRM Customer Lookup'],
  registerAsComponent: true,
  name: 'LasecCRMCustomerLookup',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  widgetMap: [
    { componentFqn: 'core.SlideOutLauncher@1.0.0', widget: 'SlideOutLauncher' },
  ],
};

export default LasecCRMCustomerLookupForm;
