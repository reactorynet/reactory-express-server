import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql, { newClientGraphQL } from './graphql';
import { AccountTypeDropdownUISchema } from '@reactory/server-core/modules/lasec/forms/widgets';

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
      selectSchemaId: 'edit',
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px'
    }
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      accountType: { md: 6, sm: 12 },
      repCode: { md: 6, sm: 12 },
      jobTitle: { md: 6, sm: 12 },
      jobTypeLabel: { md: 6, sm: 12 },
      clientDepartment: { md: 6, sm: 12 },
      // customerClass: { md: 6, sm: 12 },
      customerClassLabel: { md: 6, sm: 12 },
      ranking: { md: 6, sm: 12 },
      faculty: { md: 6, sm: 12 },
      customerType: { md: 6, sm: 12 },
      lineManagerLabel: { md: 6, sm: 12 },
      style: { padding: '25px 32px 0 32px' }
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
          minWidth: '150px',
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
          minWidth: '150px',
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
          minWidth: '150px',
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
          minWidth: '150px',
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
  // customerClass: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: '${formData}',
  //     variant: 'subtitle1',
  //     title: 'Customer Class',
  //     titleProps: {
  //       style: {
  //         display: 'content',
  //         minWidth: '150px',
  //         color: "#9A9A9A",
  //       }
  //     },
  //     bodyProps: {
  //       style: {
  //         display: 'flex',
  //         justifyContent: 'flex-end'
  //       }
  //     }
  //   }
  // },
  customerClassLabel: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Customer Class',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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
          minWidth: '150px',
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
          minWidth: '150px',
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
          minWidth: '150px',
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
  lineManagerLabel: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Line Manager',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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
  jobTypeLabel: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Job Type',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      selectSchemaId: 'display',
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px'
  },
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px'
    }
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      accountType: { md: 8, sm: 8 },
      repCode: { md: 6, sm: 12 },
      jobType: { md: 6, sm: 12 },
      clientDepartment: { md: 6, sm: 12 },
      customerClass: { md: 6, sm: 12 },
      ranking: { md: 6, sm: 12 },
      faculty: { md: 6, sm: 12 },
      customerType: { md: 6, sm: 12 },
      lineManager: { md: 6, sm: 12 },
      style: { padding: '25px 32px 0 32px' }
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
    ...AccountTypeDropdownUISchema
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
  },
  faculty: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetFacultyList {
        LasecGetFacultyList {
          id
          name
        }
      }`,
      resultItem: 'LasecGetFacultyList',
      resultsMap: {
        'LasecGetFacultyList.[].id': ['[].key', '[].value'],
        'LasecGetFacultyList.[].name': '[].label',
      },
    },
  },
  customerType: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerType {
        LasecGetCustomerType {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerType',
      resultsMap: {
        'LasecGetCustomerType.[].id': ['[].key', '[].value'],
        'LasecGetCustomerType.[].name': '[].label',
      },
    },
  },
  lineManager: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerLineManagerOptions($customerId: String!) {
        LasecGetCustomerLineManagerOptions(customerId: $customerId) {
          id
          name
        }
      }`,
      propertyMap: {
        'formContext.$formData.id': 'customerId'
      },
      resultItem: 'LasecGetCustomerLineManagerOptions',
      resultsMap: {
        'LasecGetCustomerLineManagerOptions.[].id': ['[].key', '[].value'],
        'LasecGetCustomerLineManagerOptions.[].name': '[].label',
      },
    },
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
      jobTitle: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobType: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobTypeLabel: { xs: 12, sm: 12, md: 6, lg: 4 },
      // lineManager: { xs: 12, sm: 12, md: 6, lg: 4 },
      // lineManagerLabel: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerType: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerClass: { xs: 12, sm: 12, md: 6, lg: 4 },
      faculty: { xs: 12, sm: 12, md: 6, lg: 4 },
      clientDepartment: { xs: 12, sm: 12, md: 6, lg: 4 },
      ranking: { xs: 12, sm: 12, md: 6, lg: 4 },
      style: { padding: '25px 32px 0 32px' }
    }
  ],


  jobTitle: {
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
      title: 'Job Title',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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

    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Job Type',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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

  // lineManager: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: '${formData}',
  //     variant: 'subtitle1',
  //     title: 'Line Manager',
  //     titleProps: {
  //       style: {
  //         display: 'content',
  //         minWidth: '150px',
  //         color: "#9A9A9A",
  //       }
  //     },
  //     bodyProps: {
  //       style: {
  //         display: 'flex',
  //         justifyContent: 'flex-end'
  //       }
  //     }
  //   }
  // },

  customerType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Customer Type',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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
          minWidth: '150px',
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
          minWidth: '150px',
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
      title: 'Customer Class',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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
          minWidth: '150px',
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
  // lineManagerLabel: {
  //   'ui:widget': 'LabelWidget',
  //   'ui:options': {
  //     format: '${formData}',
  //     variant: 'subtitle1',
  //     title: 'Line Manager',
  //     titleProps: {
  //       style: {
  //         display: 'content',
  //         minWidth: '150px',
  //         color: "#9A9A9A",
  //       }
  //     },
  //     bodyProps: {
  //       style: {
  //         display: 'flex',
  //         justifyContent: 'flex-end'
  //       }
  //     }
  //   }
  // },
  jobTypeLabel: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Job Type Label',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
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

const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
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
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '30px'
  },
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px',
      marginBottom: '16px'
    }
  },
  'ui:grid-layout': [
    {
      jobTitle: { xs: 12, sm: 12, md: 6, lg: 4 },
      jobType: { xs: 12, sm: 12, md: 6, lg: 4 },
      customerClass: { xs: 12, sm: 12, md: 6, lg: 4 },
      clientDepartment: { xs: 12, sm: 12, md: 6, lg: 4 },
      ranking: { xs: 12, sm: 12, md: 6, lg: 4 },
      faculty: { md: 6, sm: 12 },
      customerType: { xs: 12, sm: 12, md: 6, lg: 4 },
      // lineManager: { xs: 12, sm: 12, md: 6, lg: 4 },
      style: { padding: '25px 32px 0 32px' }
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
  },
  faculty: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetFacultyList {
        LasecGetFacultyList {
          id
          name
        }
      }`,
      resultItem: 'LasecGetFacultyList',
      resultsMap: {
        'LasecGetFacultyList.[].id': ['[].key', '[].value'],
        'LasecGetFacultyList.[].name': '[].label',
      },
    },
  },
  customerType: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerType {
        LasecGetCustomerType {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerType',
      resultsMap: {
        'LasecGetCustomerType.[].id': ['[].key', '[].value'],
        'LasecGetCustomerType.[].name': '[].label',
      },
    },
  },
  // lineManager: {
  //   'ui:widget': 'SelectWithDataWidget',
  //   'ui:options': {
  //     multiSelect: false,
  //     query: `query LasecGetCustomerLineManagerOptions($customerId: String!) {
  //       LasecGetCustomerLineManagerOptions(customerId: $customerId) {
  //         id
  //         name
  //       }
  //     }`,
  //     propertyMap: {
  //       'formContext.$formData.id': 'customerId'
  //     },
  //     resultItem: 'LasecGetCustomerLineManagerOptions',
  //     resultsMap: {
  //       'LasecGetCustomerLineManagerOptions.[].id': ['[].key', '[].value'],
  //       'LasecGetCustomerLineManagerOptions.[].name': '[].label',
  //     },
  //   },
  // },
};

const schema: Reactory.ISchema = {
  type: "object",
  title: "JOB DETAILS",
  required: ['customerClass', 'clientDepartment', 'ranking'],
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
    customerClass: {
      type: "string",
      title: "Class"
    },
    customerClassLabel: {
      type: "string",
      title: "Class"
    },
    customerId: {
      type: "string",
      title: "Class"
    },
    ranking: {
      type: "string",
      title: "Ranking"
    },
    faculty: {
      type: "string",
      title: "Faculty"
    },
    customerType: {
      type: "string",
      title: "Customer Type"
    },
    lineManager: {
      type: "string",
      title: "Line Manager"
    },
    lineManagerLabel: {
      type: "string",
      title: "Line Manager"
    },
    jobType: {
      type: "string",
      title: "Job Type"
    },
    jobTypeLabel: {
      type: "string",
      title: "Job Type"
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
