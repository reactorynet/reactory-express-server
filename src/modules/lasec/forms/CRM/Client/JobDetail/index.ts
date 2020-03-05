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
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
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
        width: '100%',
        float: "right"
      },
    }
  },
  accountType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Account Type',
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

  repCode: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Rep Code',
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

  jobTitle: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Job Title',
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

  clientDepartment: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Department',
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

  clientClass: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Class',
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

  ranking: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Ranking',
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

const editUiSchema: any = {
  'ui:options': {
    componentType: "div",
    // toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      buttonVariant: "contained",
      selectSchemaId: 'display'
    },
    style:{
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      accountType: { sm: 12, md: 6 },
      repCode: { sm: 12, md: 6 },
      jobTitle: { sm: 12, md: 6 },
      clientDepartment: { sm: 12, md: 6 },
      clientClass: { sm: 12, md: 6 },
      ranking: { sm: 12, md: 6 },
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  accountType: {},
  repCode: {},
  jobTitle: {},
  clientDepartment: {},
  clientClass: {},
  ranking: {}
};

const schema: Reactory.ISchema = {
  type: "object",
  title: "JOB DETAILS",
  properties: {
    view: {
      title: '',
      type: 'string'
    },
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
