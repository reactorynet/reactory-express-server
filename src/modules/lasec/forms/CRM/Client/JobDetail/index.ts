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
      accountType: { md: 12 },
      repCode: { md: 12 },
      jobTitle: { md: 12 },
      clientDepartment: { md: 12 },
      clientClass: { md: 12 },
      ranking: { md: 12 }     
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
  accountType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Account Type',
    }
  },

  repCode: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Rep Code',
    }
  },

  jobTitle: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Job Title',
    }
  },

  clientDepartment: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Department',
    }
  },

  clientClass: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Class',
    }
  },

  ranking:  {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Ranking',
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
      accountType: { md: 12 },
      repCode: { md: 12 },
      jobTitle: { md: 12 },
      clientDepartment: { md: 12 },
      clientClass: { md: 12 },
      ranking: { md: 12 }
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
  accountType: {},
  repCode: {},
  jobTitle: {},
  clientDepartment: {},
  clientClass:{},
  ranking:{}
};

const schema: Reactory.ISchema = { 
  type: "object",
  title: "JOB DETAILS",
  properties: {
    accountType: {
      type: "string",
      title: "Account Type"
    },
    repCode: {
      type: "string",
      title: "Rep Code"
    },
    jobTitle: {
      type: "string",
      title: "Job Title"
    },
    clientDepartment: {
      type: "string",
      title: "Client Department"
    },
    clientClass: {
      type: "string",
      title: "Class"
    },
    ranking: {
      type: "string",
      title: "Ranking"
    }
  }
};

const LasecCRMClientJobDetails: Reactory.IReactoryForm = {
  id: 'LasecCRMClientJobDetails',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMClientJobDetails',
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

export default LasecCRMClientJobDetails;
