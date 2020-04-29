import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql, { newClientGraphQL } from './graphql';

export const displayUiSchema: any = {
  'ui:graphql': graphql,
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
      emailAddress: { lg: 6, md: 12, sm: 12 },
      alternateEmail: { lg: 6, md: 12, sm: 12 },
      officeNumber: { lg: 6, md: 12, sm: 12 },
      mobileNumber: { lg: 6, md: 12, sm: 12 },
      alternateNumber: { lg: 6, md: 12, sm: 12 },
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
  emailAddress: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Email Address',
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
  alternateEmail: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Email',
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
  officeNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Office Number',
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
  mobileNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Mobile Number',
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
  alternateNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Number',
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


export const newConfirmSchema: any = {  
  'ui:graphql': newClientGraphQL,
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
      emailAddress: { xs: 12, sm: 12, md: 6, lg: 4 },
      alternateEmail: { xs: 12, sm: 12, md: 6, lg: 4 },
      officeNumber: { xs: 12, sm: 12, md: 6, lg: 4 },
      mobileNumber: { xs: 12, sm: 12, md: 6, lg: 4 },
      alternateNumber: { xs: 12, sm: 12, md: 6, lg: 4 },
    }
  ], 
  emailAddress: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Email Address',
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
  alternateEmail: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Email',
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
  officeNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Office Number',
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
  mobileNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Mobile Number',
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
  alternateNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Number',
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
  'ui:graphql': graphql,
  'ui:options': {
    componentType: "div",
    // toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginBottom: '0px',
      // margin: '0px',
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
      emailAddress: { sm: 12, md: 12, lg: 12 },
      alternateEmail: { sm: 12, md: 12, lg: 12 },
      mobileNumber: { sm: 12, md: 12, lg: 12 },
      alternateNumber: { sm: 12, md: 12, lg: 12 },
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
  emailAddress: {},
  alternateEmail: {},
  mobileNumber: {},
  alternateNumber: {},
};

const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginBottom: '0px',
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
      emailAddress: { xs: 12, sm: 12, md: 6, lg: 4 },
      confirmEmail: { xs: 12, sm: 12, md: 6, lg: 4 },
      alternateEmail: { xs: 12, sm: 12, md: 6, lg: 4 },
      confirmAlternateEmail: { xs: 12, sm: 12, md: 6, lg: 4 },
      mobileNumber: { xs: 12, sm: 12, md: 6, lg: 4 },
      alternateMobileNumber: { xs: 12, sm: 12, md: 6, lg: 4 },
      officeNumber: { xs: 12, sm: 12, md: 6, lg: 4 },
      prefferedMethodOfContact: { xs: 12, sm: 12, md: 6, lg: 4 },
    }
  ],
  emailAddress: {},
  confirmEmail: {},
  alternateEmail: {},
  confirmAlternate: {},
  mobileNumber: {},
  alternateMobileNumber: {},
  officeNumber: {},
  prefferedMethodOfContact: {
    'ui:widget': 'RadioGroupComponent',
    'ui:options': {
      label: 'Preffered Method Of Contact',
      radioOptions: [
        {
          key: 'email',
          value: 'email',
          label: 'Email',
        },
        {
          key: 'phone',
          value: 'phone',
          label: 'Phone',
        },
        {
          key: 'fax',
          value: 'fax',
          label: 'Fax',
        },
      ]
    },
    propsMap: {
      'formContext.formData.prefferedMethodOfContact': 'selectedValue',
    },
  },
};

const schema: Reactory.ISchema = {
  type: "object",
  title: "CONTACT DETAILS",
  required: ['emailAddress', 'confirmEmail', 'mobileNumber'],
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    emailAddress: {
      type: "string",
      title: "Email Address",
      
    },
    confirmEmail: {
      type: "string",
      title: "Confirm Email Address"
    },
    alternateEmail: {
      type: "string",
      title: "Alternate Email",
    },
    confirmAlternateEmail: {
      type: "string",
      title: "Confirm Alternate Email Address"
    },
    officeNumber: {
      type: "string",
      title: "Office Number",
    },
    mobileNumber: {
      type: "string",
      title: "Mobile Number",
    },
    alternateMobileNumber: {
      type: "string",
      title: "Alternate Mobile Number"
    },
    alternateNumber: {
      type: "string",
      title: "Alternate Number",
    },
    prefferedMethodOfContact: {
      type: 'number',
      title: 'Preffered Method of Communication',
      default: 'email'
    },
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
    {
      id: 'new',
      title: 'EDIT',
      key: 'new',
      description: 'Create Contact Details',
      icon: 'pencil',
      uiSchema: newUiSchema,
    },
  ],
  defaultFormValue: {
    prefferedMethodOfContact: 'email'
  },
  widgetMap: [
    { componentFqn: 'core.RadioGroupComponent@1.0.0', widget: 'RadioGroupComponent' },
  ],
};

export default LasecCRMContactInformation;
