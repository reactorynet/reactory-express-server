import { Reactory } from '@reactory/server-core/types/reactory'
import { newClientGraphQL } from './graphql';

export const uiSchema: any = {
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
      name: { xs: 12, sm: 12, md: 6, lg: 4 },
    },
  ],
  name: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Organisation Name',
      title: 'Search for an Organisation',
      labelProps: {
        style: {
          fontWeight: 'bold',
          color: 'rgba(0,0,0,1)',
          marginTop: '3px'
        }
      },
      modalProps: {
        fullScreen: false,
        closeOnEvents: [
          'CloseModal:LasecCRMCustomerLookupTable'
        ]
      }
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMOrganisationLookupTable@1.0.0',
      componentProps: {

      },
    },
  },
};

export const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '16px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px',
      marginBottom: '16px'
    }
  },
  'ui:grid-layout': [
    {
      name: { xs: 12, sm: 12, md: 6, lg: 4 },
    },
  ],
  name: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Organisation Name',
      title: 'Search for an Organisation',
      labelProps: {
        style: {
          fontWeight: 'bold',
          color: 'rgba(0,0,0,1)',
          marginTop: '3px'
        }
      },
      modalProps: {
        fullScreen: false,
        closeOnEvents: [
          'CloseModal:LasecCRMOrganisationLookupTable'
        ]
      }
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMOrganisationLookupTable@1.0.0',
      componentProps: {
        mode: 'new',
        uiSchemaKey: 'new',
      },
      componentPropertyMap: {
        'LookupComponent.props.formContext.$formData': 'formData.selected',
        'LookupComponent.props.formContext': 'LookupComponentFormContext',
        'LookupComponent.props.mode': 'mode',
        'LookupComponent.props.uiSchemaKey': 'uiSchemaKey',
      },
    },
  },
};

export const ConfirmNewUISchema: any = {
  'ui:options': {
    componentType: "div",
    title: 'Selected Customer',
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
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '30px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px'
    }
  },
  'ui:grid-layout': [
    {
      name: { xs: 12, sm: 12, md: 12, lg: 12 },
      style: { padding: '25px 32px 0 32px' }
    },
  ],
  name: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Selected Organization',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  },
};

export const schema: Reactory.ISchema = {
  type: 'object',
  title: "Select an Organization",
  properties: {
    id: {
      type: 'string',
      title: 'Organization Id'
    },
    name: {
      title: 'Name',
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
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Customer',
      icon: 'list',
      uiSchema: uiSchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Set Customer',
      icon: 'view_module',
      uiSchema: uiSchema,
    },
    {
      id: 'new',
      title: 'NEW',
      key: 'new',
      description: 'Set Customer',
      icon: 'pencil',
      uiSchema: newUiSchema,
    },
  ],
  widgetMap: [
    { componentFqn: 'core.SlideOutLauncher@1.0.0', widget: 'SlideOutLauncher' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMOrganizationLookupForm;
