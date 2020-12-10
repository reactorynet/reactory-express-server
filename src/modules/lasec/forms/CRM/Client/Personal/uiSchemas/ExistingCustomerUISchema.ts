import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from "../../Schemas"

const uiSchema: Reactory.IUISchema = {
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
        style: {
          'justifyContent': "flex-end",
          'display': "flex",
        }
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

export default uiSchema;