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
        width: '100%',
        float: "right"
      },
    }
  },
  clientStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Client Status',
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
      },
      /*
      componentFqn: 'core.ConditionalIconComponent@1.0.0',
      componentProps: {
        conditions: [
          {
            key: 'active',
            icon: 'trip_origin',
            style: {
              color: '#5EB848'
            },
            tooltip: 'Client Active'
          },
          {
            key: 'unfinished',
            icon: 'trip_origin',
            style: {
              color: '#FF9901'
            },
            tooltip: 'Client Unfinished'
          },
          {
            key: 'deactivated',
            icon: 'trip_origin',
            style: {
              color: '#AB1257'
            },
            tooltip: 'Client Deactivated'
          }
        ]
      },
      style: {
        marginRight: '8px',
        marginTop: '8px',
      },
      componentPropsMap: {
        'formData': 'value',
      },
      */
    }
  },

  firstName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Firstname',
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
  lastName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      component: "TextField",
      componentProps: {
        variant: "outlined"
      },
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Last Name',
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
  country: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Country',
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
      clientStatus: { sm: 12, md: 12 },
      firstName: { sm: 12, md: 12 },
      lastName: { sm: 12, md: 12 },
      country: { sm: 12, md: 12 },
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
  clientStatus: {
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
          key: 'active',
          value: 'active',
          label: 'Active',
          icon: 'trip_origin',
          iconProps: {
            style: {
              color: '#5EB848',
              marginRight: '16px',
            },
          }
        },
        {
          key: 'unfinished',
          value: 'unfinished',
          label: 'Unfinished',
          icon: 'trip_origin',
          iconProps: {
            style: {
              color: '#FF9901',
              marginRight: '16px',
            },
          }
        },
        {
          key: 'deactivated',
          value: 'deactivated',
          label: 'Deactivated',
          icon: 'trip_origin',
          iconProps: {
            style: {
              color: '#AB1257',
              marginRight: '16px',
            },
          }
        },
      ],
    },
  },
  lastName: {},
  firstName: {},
  country: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerCountries {
        LasecGetCustomerCountries {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerCountries',
      resultsMap: {
        'LasecGetCustomerCountries.[].id': ['[].key', '[].value'],
        'LasecGetCustomerCountries.[].name': '[].label',
      },
    },
  },
};

const newUiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style:{
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      title: { sm: 12, md: 12 },
      firstName: { sm: 12, md: 12 },
      lastName: { sm: 12, md: 12 },
      country: { sm: 12, md: 12 },
      accountType: { sm: 12, md: 12 },
    }
  ],
  title: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetPersonTitles {
        LasecGetPersonTitles {
          id
          title
        }
      }`,
      resultItem: 'LasecGetPersonTitles',
      resultsMap: {
        'LasecGetPersonTitles.[].id': ['[].key', '[].value'],
        'LasecGetPersonTitles.[].title': '[].label',
      },
    },
  },
  firstName: {},
  lastName: {},
  country: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerCountries {
        LasecGetCustomerCountries {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerCountries',
      resultsMap: {
        'LasecGetCustomerCountries.[].id': ['[].key', '[].value'],
        'LasecGetCustomerCountries.[].name': '[].label',
      },
    },
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
        },
        {
          key: 'cod',
          value: 'cod',
          label: 'COD',
        },

      ],
    },
  },
  repCode: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerRepCodes {
        LasecGetCustomerRepCodes {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerRepCodes',
      resultsMap: {
        'LasecGetCustomerRepCodes.[].id': ['[].key', '[].value'],
        'LasecGetCustomerRepCodes.[].name': '[].label',
      },
    },
  },
};

const schema: Reactory.ISchema = { ...ClientSchema };
schema.required = ["clientStatus", "firstName", "lastName", "country"];
schema.title = "PERSONAL DETAILS"

const LasecCRMPersonalInformationForm: Reactory.IReactoryForm = {
  id: 'LasecCRMPersonalInformation',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMPersonalInformation',
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
      description: 'View Client Details',
      icon: 'list',
      uiSchema: displayUiSchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Edit Client Details',
      icon: 'view_module',
      uiSchema: editUiSchema,
    },
    {
      id: 'new',
      title: 'New',
      key: 'new',
      description: 'Capture Personal Details',
      icon: 'view_module',
      uiSchema: newUiSchema,
    },
  ],
  defaultFormValue: {},
};

export default LasecCRMPersonalInformationForm;
