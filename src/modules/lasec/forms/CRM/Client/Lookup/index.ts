import { Reactory } from '@reactory/server-core/types/reactory'

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
      client: { sm: 12 },
    },
  ],
  customer: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMClientLookupTable@1.0.0',
      componentProps: {},
    },
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    customer: {
      title: 'Select a Customer',
      type: 'string'
    },
  }
};

const LasecCRMClientLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMClientLookup',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client Lookup',
  tags: ['CRM Client Lookup'],
  registerAsComponent: true,
  name: 'LasecCRMClientLookup',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  widgetMap: [
    { componentFqn: 'core.SlideOutLauncher@1.0.0', widget: 'SlideOutLauncher' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMClientLookupForm;
