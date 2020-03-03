import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from "../Schemas"
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit'
    },
    style:{
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { md: 12 },      
    },
    {
      clientStatus: { md: 12 },
      firstName: { md: 12 },
      lastName: { md: 12 },
      country: { md: 12 },      
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        top: '10px',
        right: '10px',
        position: 'relative'
      },
    }
  },
  clientStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Status',
    }
  },

  firstName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Firstname',
    }
  },
  lastName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Last Name',
    }
  },
  country: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Country',
    }
  },
};

const editUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { md: 12 },      
    },
    {
      clientStatus: { md: 12 },
      firstName: { md: 12 },
      lastName: { md: 12 },
      country: { md: 12 },      
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        top: '10px',
        right: '10px',
        position: 'relative'
      },
    }
  },
  clientStatus: {},
  lastName: {},
  firstName: {},
  country: {},
};

const schema: Reactory.ISchema = { ...ClientSchema };
schema.title = "COMMENTS"
const LasecCRMClientComments: Reactory.IReactoryForm = {
  id: 'LasecCRMClientComments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMClientComments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql,
  uiSchema: displayUiSchema,
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Contact Details',
      icon: 'list',
      uiSchema: displayUiSchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Edit Contact Details',
      icon: 'view_module',
      uiSchema: editUiSchema,
    },
  ],
  defaultFormValue: {
    
  },

};

export default LasecCRMClientComments;
