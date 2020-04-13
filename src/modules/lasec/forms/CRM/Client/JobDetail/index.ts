import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql from './graphql';

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
      accountType: { lg: 4, md: 6, sm: 12 },
      repCode: { lg: 4, md: 6, sm: 12 },
      jobTitle: { lg: 4, md: 6, sm: 12 },
      clientDepartment: { lg: 4, md: 6, sm: 12 },
      clientClass: { lg: 4, md: 6, sm: 12 },
      ranking: { lg: 4, md: 6, sm: 12 }
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
      accountType: { lg: 4, md: 6, sm: 12 },
      repCode: { lg: 4, md: 6, sm: 12 },
      jobTitle: { lg: 4, md: 6, sm: 12 },
      clientDepartment: { lg: 4, md: 6, sm: 12 },
      clientClass: { lg: 4, md: 6, sm: 12 },
      ranking: { lg: 4, md: 6, sm: 12 }
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
  jobTitle: {
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
  clientClass: {
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
      jobTitle: { lg: 4, md: 6, sm: 12 },
      jobType: { lg: 4, md: 6, sm: 12 },
      lineManager: { lg: 4, md: 6, sm: 12 },
      customerType: { lg: 4, md: 6, sm: 12 },
      clientClass: { lg: 4, md: 6, sm: 12 },
      faculty: { lg: 4, md: 6, sm: 12 },
      clientDepartment: { lg: 4, md: 6, sm: 12 },
      ranking: { lg: 4, md: 6, sm: 12 },
    }
  ],

  jobTitle: {
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
  jobType: {
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
        // {
        //   key: 'type-1',
        //   value: 'type-1',
        //   label: 'Type 1',
        // },
      ],
    },
  },
  lineManager: {
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
          key: 'manager-1',
          value: 'manager-1',
          label: 'Manager 1',
        },
        {
          key: 'manager-2',
          value: 'manager-2',
          label: 'Manager 2',
        },
      ],
    },
  },
  customerType: {
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
        // {
        //   key: 'type-1',
        //   value: 'type-1',
        //   label: 'Type 1',
        // },
      ],
    },
  },
  clientClass: {
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
        // {
        //   key: 'type-1',
        //   value: 'type-1',
        //   label: 'Faculty 1',
        // },
      ],
    },
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
    clientClass: {
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
