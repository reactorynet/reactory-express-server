import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import { AccountTypeDropdownUISchema } from '../../../widgets'
import graphql, { newClientGraphQL } from './graphql';

export const displayUiSchema: any = {
  'ui:graphql': graphql,
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '24px',
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
    showSchemaSelectorInToolbar: true,
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
      view: { lg: 12, sm: 12, md: 12 },
    },
    {
      clientStatus: { md: 6, sm: 12 },
      titleLabel: { md: 6, sm: 12 },
      firstName: { md: 6, sm: 12 },
      lastName: { md: 6, sm: 12 },
      country: { md: 6, sm: 12 },
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
  clientStatus: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData ? formData.toUpperCase() : "Loading"}',
      variant: 'subtitle1',
      title: 'Client Status',
      icon: 'trip_origin',
      iconPosition: 'inline',
      iconProps: {
        style: {
          color: '#FF9901',
          margingRight: '4px'
        },

      },
      $iconProps: 'lasec-crm.ClientStatusIconFormatFunction@1.0.0',
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
          justifyContent: 'flex-end',
        }
      },
    }
  },
  titleLabel: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Title',
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
  country: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Country',
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

export const editUiSchema: any = {
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
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px 60px 24px'
    }
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      clientStatus: { md: 6, sm: 6 },
      title: { md: 5, sm: 12 },
      firstName: { md: 6, sm: 12 },
      lastName: { md: 6, sm: 12 },
      country: { md: 6, sm: 12 },
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
      labelStyle: {
        transform: 'none',
        fontWeight: 'bold',
        color: '#000000',
        backgroundColor: 'transparent',
        padding: 0
      },
      selectProps: {
        style: {
          marginTop: '1.3rem',
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
              verticalAlign: 'middle'
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
              verticalAlign: 'middle'
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
              verticalAlign: 'middle'
            },
          }
        },
      ],
    },
  },
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
      selectProps: {
        style: {
          marginTop: '1.3rem',

        }
      },
      labelStyle: {
        transform: 'none',
        fontWeight: 'bold',
        color: '#000000',
        backgroundColor: 'transparent',
        padding: 0
      }
    },
    'ui:description': "Select the client title",
  },
  lastName: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Last Name',
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
  firstName: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'First Name',
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
      selectProps: {
        style: {
          marginTop: '1.3rem',
        }
      },
      labelStyle: {
        transform: 'none',
        fontWeight: 'bold',
        color: '#000000',
        backgroundColor: 'transparent',
        padding: 0
      }
    },
  },
};

export const newUiSchema: any = {
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
    showToolbar: false,
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
      clientTitle: { sm: 12, md: 6 },
      firstName: { sm: 12, md: 6 },
      lastName: { sm: 12, md: 6 },
      country: { sm: 12, md: 6 },
      accountType: { sm: 12, md: 6 },
      repCode: { sm: 12, md: 6 },
      style: { padding: '25px 32px 0 32px' }
    }
  ],
  clientTitle: {
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
    'ui:description': "Select the client title",
  },
  firstName: {
    'ui:description': "Please provide the client first name",
  },
  lastName: {
    'ui:description': "Please provide the client Lastname",
  },
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
    ...AccountTypeDropdownUISchema
  },
  repCode: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecSalesTeams {
        LasecSalesTeams {
          id
          name
          title
        }
      }`,
      resultItem: 'LasecSalesTeams',
      resultsMap: {
        'LasecSalesTeams.[].id': '[].id',
        'LasecSalesTeams.[].name': ['[].key', '[].value'],
        'LasecSalesTeams.[].title': '[].label',
      },
    },
  },
};

export const confirmUiSchema: any = {
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
      clientTitle: { md: 6, sm: 12 },
      firstName: { md: 6, sm: 12 },
      lastName: { md: 6, sm: 12 },
      country: { md: 6, sm: 12 },
      accountType: { md: 6, sm: 12 },
      repCode: { md: 6, sm: 12 },
      style: { padding: '25px 32px 0 32px' }
    }
  ],
  clientTitle: {
    'ui:graphql': {
      name: 'LasecGetPersonTitleById',
      text: `query LasecGetPersonTitleById($id: String){
        LasecGetPersonTitleById(id: $id) {
          title
        }
      }`,
      variables: {
        'formData': 'id'
      },
      resultType: 'string',
      resultKey: 'title',
      resultMap: {
        'title': 'formData',
      },
    },
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '$LOOKUP$',
      variant: 'subtitle1',
      title: 'Title',
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
  accountType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData ? formData.toUpperCase() : "ACCOUNT TYPE" }',
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
      },
    }
  },
  repCode: {
    'ui:widget': 'LabelWidget',
    'ui:options': {

      readOnly: true,
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
      },
    }
  },
};

const schema: Reactory.ISchema = { ...ClientSchema };
schema.required = ["firstName", "lastName", "country"];
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
  widgetMap: [
    {
      componentFqn: 'core.ConditionalIconComponent',
      widget: 'ConditionalIcon'
    }
  ],
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
