import { Reactory } from '@reactory/server-core/types/reactory'
import { newClientGraphQL } from './graphql';
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
      customer: { sm: 12 },
    },
  ],
  customer: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer',
      modalProps: {
        fullScreen: false,
        closeOnEvents: [
          'CloseModal:LasecCRMCustomerLookupTable'
        ]
      }
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      componentProps: {},
    },
  },
};



const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
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
      registeredName: { xs: 12, sm: 12, md: 6, lg: 4 },
    },
  ],
  registeredName: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Customer Registered Name',
      title: 'Search for a Customer',
      modalProps: {
        fullScreen: false,
        closeOnEvents: [
          'CloseModal:LasecCRMCustomerLookupTable'
        ]
      }
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      componentProps: {

      },
      componentPropertyMap: {        
        'LookupComponent.props.formContext.$formData': 'formData.selected',
        'LookupComponent.props.onChange': 'onCustomerSelect',
        'LookupComponent.props.formContext': 'LookupComponentFormContext',
      },      
    },
  },
};

export const CustomerConfirmUISchema: any = {  
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
      registeredName: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
  ],
  registeredName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Customer Registered Name',
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

const schema: Reactory.ISchema = {
  type: 'object',
  title: "Select a customer",
  properties: {
    id: {
      title: 'Customer ID',
      type: 'string'
    },
    registeredName: {
      title: 'Registered Name',
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
      title: 'EDIT',
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

export default LasecCRMCustomerLookupForm;
