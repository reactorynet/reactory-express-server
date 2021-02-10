import { Reactory } from '@reactory/server-core/types/reactory';
import { AccountTypeDropdownUISchema } from '@reactory/server-modules/lasec/forms/widgets'

const uiSchema: Reactory.IUISchema = {
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
      components: ["submit"],
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
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
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '10px'
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
      title: { md: 6, sm: 12 },
      firstName: { md: 6, sm: 12 },
      lastName: { md: 6, sm: 12 },
      country: { md: 6, sm: 12 },
      accountType: { sm: 12, md: 6 },
      repCode: { sm: 12, md: 6 },
      style: { padding: '25px 32px 0 32px' }
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
    'ui:description': "Select the client title",
  },
  lastName: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Last Name',
      },
    }
  },
  firstName: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'First Name',

      },
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
      query: `query LasecLoggedInUser {
          LasecLoggedInUser {
            id
            repCodes            
          }
        }`,
      resultItem: 'LasecLoggedInUser',
      resultsMap: {
        'LasecLoggedInUser.repCodes[]': ['[].key', '[].value', '[].label'],
      },
    },
  },
};

export default uiSchema;
