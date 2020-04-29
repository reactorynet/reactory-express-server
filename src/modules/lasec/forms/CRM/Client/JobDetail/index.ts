import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql, { newClientGraphQL } from './graphql';

export const displayUiSchema: any = {
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
      accountType: { xs: 12, sm: 12, md: 6, lg: 4 },
      repCode: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobTitle: { xs: 12, sm: 12, md: 6, lg: 4 },
      clientDepartment: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerClass: { xs: 12, sm: 12, md: 6, lg: 4 },
      ranking: { xs: 12, sm: 12, md: 6, lg: 4 }
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

  customerClass: {
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

export const ConfirmUiSchema: any = {
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
      jobTitle: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobType: { xs: 12, sm: 12, md: 6, lg: 4 },
      lineManager: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerType: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerClass: { xs: 12, sm: 12, md: 6, lg: 4 },
      faculty: { xs: 12, sm: 12, md: 6, lg: 4 },
      clientDepartment: { xs: 12, sm: 12, md: 6, lg: 4 },
      ranking: { xs: 12, sm: 12, md: 6, lg: 4 },
    }
  ],  
 

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

  jobType: {
    'ui:graphql': {
      name: 'LasecGetCustomerJobTypeById',
      text: `query LasecGetCustomerJobTypeById($id: String){
        LasecGetCustomerJobTypeById(id: $id) {
          name
        }
      }`,
      variables: {
        'formData': 'id'
      },
      resultType: 'string',
      resultKey: 'name',
      resultMap: {
        'name': 'formData',
      },
    },
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '$LOOKUP$',
      variant: 'subtitle1',
      title: 'Job Type',
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

  lineManager: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Line Manager',
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

  customerType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Customer Type',
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
  

  faculty: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Faculty',
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

  customerClass: {
    'ui:graphql': {
      name: 'LasecGetCustomerClassById',
      text: `query LasecGetCustomerClassById($id: String){
        LasecGetCustomerClassById(id: $id) {
          name
        }
      }`,
      variables: {
        'formData': 'id'
      },
      resultType: 'string',
      resultKey: 'name',
      resultMap: {
        'name': 'formData',
      },
    },
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '$LOOKUP$',
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
    'ui:graphql': {
      name: 'LasecGetCustomerRankingById',
      text: `query LasecGetCustomerRankingById($id: String){
        LasecGetCustomerRankingById(id: $id) {
          id
          name
        }
      }`,
      variables: {
        'formData': 'id'
      },
      resultType: 'string',
      resultKey: 'name',
      resultMap: {
        'name': 'formData',
      },
    },
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '$LOOKUP$',
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
    style: {
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
      accountType: { xs: 12, sm: 12, md: 6, lg: 4 },
      repCode: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobType: { xs: 12, sm: 12, md: 6, lg: 4 },
      clientDepartment: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerClass: { xs: 12, sm: 12, md: 6, lg: 4 },
      ranking: { xs: 12, sm: 12, md: 6, lg: 4 }
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
    'ui:widget': 'SelectWidget',
    'ui:options': {
      FormControl: {
        props: {
          style: {
            maxWidth: '400px'
          }
        }
      },
      selectOptions: [
        {
          key: 'account',
          value: 'account',
          label: 'Account',
          icon: 'account_balance_wallet',
          iconProps: {
            style: {
              color: '#FF9901',
              marginRight: '16px',
            },
          }
        },
        {
          key: 'cod',
          value: 'COD',
          label: 'COD',
          icon: 'attach_money',
          iconProps: {
            style: {
              color: '#5EB848',
              marginRight: '16px',
            },
          }
        },
      ],
    }
  },
  repCode: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecSalesTeams {
        LasecSalesTeams {
          id
          title
          meta  {
            reference
          }
        }
      }`,
      resultItem: 'LasecSalesTeams',
      resultsMap: {
        'LasecSalesTeams.[].meta.reference': ['[].key', '[].value'],
        'LasecSalesTeams.[].title': '[].label',
      },
    },
  },
  jobType: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerRoles {
        LasecGetCustomerRoles {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerRoles',
      resultsMap: {
        'LasecGetCustomerRoles.[].id': ['[].key', '[].value'],
        'LasecGetCustomerRoles.[].name': '[].label',
      },
    },
  },
  clientDepartment: {},
  customerClass: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerClass {
        LasecGetCustomerClass {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerClass',
      resultsMap: {
        'LasecGetCustomerClass.[].id': ['[].key', '[].value'],
        'LasecGetCustomerClass.[].name': '[].label',
      },
    },
  },
  ranking: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      FormControl: {
        props: {
          style: {
            maxWidth: '400px'
          }
        }
      },
      selectOptions: [
        {
          key: '1',
          value: '1',
          label: 'A - High Value',
        },
        {
          key: '2',
          value: '2',
          label: 'B - Medium Value',
        },
        {
          key: '3',
          value: '3',
          label: 'C - Low Value',
        },
      ],
    }
  }
};

const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      jobTitle: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobType: { xs: 12, sm: 12, md: 6, lg: 4 },
      lineManager: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerType: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerClass: { xs: 12, sm: 12, md: 6, lg: 4 },
      faculty: { xs: 12, sm: 12, md: 6, lg: 4 },
      clientDepartment: { xs: 12, sm: 12, md: 6, lg: 4 },
      ranking: { xs: 12, sm: 12, md: 6, lg: 4 },
    }
  ],

  jobTitle: {
    
  },
  jobType: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerRoles {
        LasecGetCustomerRoles {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerRoles',
      resultsMap: {
        'LasecGetCustomerRoles.[].id': ['[].key', '[].value'],
        'LasecGetCustomerRoles.[].name': '[].label',
      },
    },
  },
  lineManager: {
    
  },
  customerType: {   
  },
  customerClass: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerClass {
        LasecGetCustomerClass {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerClass',
      resultsMap: {
        'LasecGetCustomerClass.[].id': ['[].key', '[].value'],
        'LasecGetCustomerClass.[].name': '[].label',
      },
    },
  },
  faculty: {
   
  },
  clientDepartment: {},
  ranking: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      FormControl: {
        props: {
          style: {
            maxWidth: '400px'
          }
        }
      },
      selectOptions: [
        {
          key: '1',
          value: '1',
          label: 'A - High Value',
        },
        {
          key: '2',
          value: '2',
          label: 'B - Medium Value',
        },
        {
          key: '3',
          value: '3',
          label: 'C - Low Value',
        },
      ],
    }
  }
};

const schema: Reactory.ISchema = {
  type: "object",
  title: "JOB DETAILS",
  required: ['jobTitle', 'customerType', 'customerClass', 'clientDepartment', 'ranking'],
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
    jobType: {
      type: "string",
      title: "Job Type"
    },
    clientDepartment: {
      type: "string",
      title: "Client Department"
    },
    customerClass: {
      type: "string",
      title: "Class"
    },
    ranking: {
      type: "string",
      title: "Ranking"
    },
    lineManager: {
      type: "string",
      title: "Line Manager"
    },
    customerType: {
      type: "string",
      title: "Customer Type"
    },
    faculty: {
      type: "string",
      title: "Faculty"
    },
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
  //uiSchema: newUiSchema,
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
    {
      id: 'new',
      title: 'NEW',
      key: 'new',
      description: 'Edit Contact Details',
      icon: 'view_module',
      uiSchema: newUiSchema,
    },
  ],
  defaultFormValue: {},

};

export default LasecCRMClientJobDetails;
