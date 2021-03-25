import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql, { newClientGraphQL } from './graphql';

const newSchema: Reactory.ISchema = {
  type: "object",
  title: "CONTACT DETAILS",
  required: ['emailAddress', 'confirmEmail', 'officeNumber'],
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    emailAddress: {
      type: "string",
      title: "Email Address",
      format: "email",
    },
    confirmEmail: {
      type: "string",
      title: "Confirm Email Address",
    },
    alternateEmail: {
      type: "string",
      title: "Alternate Email",
    },
    confirmAlternateEmail: {
      type: "string",
      title: "Confirm Alternate Email Address",
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
      type: 'string',
      title: 'Preffered Method of Communication',
      default: 'email'
    },
  }
};

const editSchema: Reactory.ISchema = {
  type: "object",
  title: "CONTACT DETAILS",
  required: ['emailAddress', 'officeNumber'],
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    emailAddress: {
      type: "string",
      title: "Email Address",
      // format: "email",
    },
    confirmEmail: {
      type: "string",
      title: "Confirm Email Address",
    },
    alternateEmail: {
      type: "string",
      title: "Alternate Email",
    },
    confirmAlternateEmail: {
      type: "string",
      title: "Confirm Alternate Email Address",
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
      type: 'string',
      title: 'Preffered Method of Communication',
      default: 'email'
    },
  }
};

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
      selectSchemaId: 'edit',
      buttonVariant: 'outlined',
      style: {
        top: '10px'
      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      }
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
      // padding: '24px'
      padding: '24px 24px 60px'
    }
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      emailAddress: { md: 3, sm: 12 },
      alternateEmail: { md: 3, sm: 12 },
    },
    {
      officeNumber: { md: 3, sm: 12 },
      mobileNumber: { md: 3, sm: 12 },
    },
    {
      alternateNumber: { md: 3, sm: 12 },
    },
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      showLabel: false,
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  emailAddress: {
    'ui:widget': 'LabelWidget',
    'ui:title': 'Email Address',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Email Address',
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
  alternateEmail: {
    'ui:widget': 'LabelWidget',
    'ui:title': 'Alternate Email',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Email',
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
  officeNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Office Number',
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
  mobileNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Mobile Number',
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
  alternateNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Number',
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
  'ui:graphql': graphql,
  'ui:schema': editSchema,
  'ui:options': {
    componentType: "div",
    toolbarPosition: "none",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginBottom: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      selectSchemaId: 'display',
      buttonVariant: 'outlined',
      style: {
        top: 0
      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      },
      components: ['submit'],
    },
    style: {
      marginTop: '16px',
    },
    submitProps: {
      variant: 'contained',
      text: 'SAVE CHANGES',
      color: 'primary',
      iconAlign: 'left',
      style: {
        marginLeft: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      }
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px 24px'
    }
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '10px'
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      emailAddress: { md: 3, sm: 12 },
      alternateEmail: { md: 3, sm: 12 },
    },
    {
      mobileNumber: { md: 3, sm: 12 },
      officeNumber: { md: 3, sm: 12 },
    },
    {
      alternateNumber: { md: 3, sm: 12 },
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      showLabel: false,
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  emailAddress: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Email Address',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  alternateEmail: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Alternate Email',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  mobileNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Mobile Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  officeNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Office Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  alternateNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Alternate Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
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
      selectSchemaId: 'edit',
      buttonVariant: 'outlined',
      style: {
        top: '10px'

      },
      buttonStyle: {
        borderWidth: '2px',
        fontWeight: 'bold',
        fontSize: '1em'
      }
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
    paddingBottom: '15px',
    marginBottom: '45px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px',
    },
  },
  'ui:grid-layout': [
    {
      emailAddress: { sm: 12, md: 3 },
      alternateEmail: { sm: 12, md: 3 },
    },
    {
      officeNumber: { sm: 12, md: 3 },
      mobileNumber: { sm: 12, md: 3 },
    },
    // {
    //   alternateNumber: { sm: 12, md: 3 }
    // },
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
  alternateEmail: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Email',
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
  officeNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Office Number',
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
  mobileNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Mobile Number',
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
  alternateNumber: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Alternate Number',
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
      marginBottom: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '15px',
    marginBottom: '45px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px'
    }
  },
  'ui:grid-layout': [
    {
      emailAddress: { sm: 12, md: 3 },
      confirmEmail: { sm: 12, md: 3 },
    },
    {
      alternateEmail: { sm: 12, md: 3 },
      confirmAlternateEmail: { sm: 12, md: 3 },
    },
    {
      mobileNumber: { sm: 12, md: 3 },
      alternateMobileNumber: { sm: 12, md: 3 },
    },
    {
      officeNumber: { sm: 12, md: 3 },
      alternateNumber: { sm: 12, md: 3 },
    },
    {
      prefferedMethodOfContact: { sm: 12, md: 3 },
    },
  ],
  emailAddress: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Email Address',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    },
    'ui:title': 'Email Address',
  },
  confirmEmail: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Confirm Email Address',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    },
    'ui:title': 'Confirm Email',
  },
  alternateEmail: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Alternate Email',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    },
    'ui:title': 'Alternate Email',
  },
  confirmAlternateEmail: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Confirm Alternate Email',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    },
    'ui:title': 'Alternate Email Confirm',
  },
  mobileNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Mobile Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  alternateMobileNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Alternate Mobile Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  officeNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Office Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
  alternateNumber: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Office Number',
        style: {
          marginTop: '1.3rem'
        }
      },
      labelProps: {
        dontShrink: true,
        style: {
          transform: 'none',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    }
  },
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
  schema: newSchema,
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
