import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',     
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
      emailAddress: { md: 12 },
      alternateEmail: { md: 12 },
      mobileNumber: { md: 12 },
      alternateNumber: { md: 12 },      
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
  emailAddress: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Email Address',
    }
  },

  alternateEmail: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Email',      
    }
  },
  mobileNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Mobile Number',
    }
  },
  alternateNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Number',
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
      emailAddress: { md: 12 },
      alternateEmail: { md: 12 },
      mobileNumber: { md: 12 },
      alternateNumber: { md: 12 },      
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
  emailAddress: {},
  alternateEmail: {},
  mobileNumber: {},
  alternateNumber: {},
};

const schema: Reactory.ISchema = { 
  type: "object",
  title: "CONTACT DETAILS",
  properties: {
    emailAddress: {
      type: "string",
      title: "Email Address",
    },
    alternateEmail: {
      type: "string",
      title: "Alternate Email",
    },
    mobileNumber: {
      type: "string",
      title: "Mobile Number",
    },
    alternateNumber: {
      type: "string",
      title: "Alternate Number",
    }
  }
};

const LasecCRMContactInformation: Reactory.IReactoryForm = {
  id: 'LasecCRMContactInformation',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMContactInformation',
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

export default LasecCRMContactInformation;
