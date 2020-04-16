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
      organisation: { sm: 12 },
    },
  ],
  organisation: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select an Organisation',
      title: 'Search for an Organisation'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMOrganisationLookupTable@1.0.0',
      componentProps: {},
    },
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    organisation: {
      title: 'Select an Organisation',
      type: 'string'
    },
  }
};

const LasecCRMOrganizationLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMOrganizationLookup',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Organization Lookup',
  tags: ['CRM Organization Lookup'],
  registerAsComponent: true,
  name: 'LasecCRMOrganizationLookup',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  widgetMap: [
    { componentFqn: 'core.SlideOutLauncher@1.0.0', widget: 'SlideOutLauncher' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMOrganizationLookupForm;
