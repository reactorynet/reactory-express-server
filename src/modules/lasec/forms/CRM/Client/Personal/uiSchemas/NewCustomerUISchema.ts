import { Reactory } from '@reactory/server-core/types/reactory';
import { AccountTypeDropdownUISchema } from '@reactory/server-modules/lasec/forms/widgets'
import { newClientGraphQL } from '../graphql';

const uiSchema: Reactory.IUISchema = {
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
      },
      'ui:description': "Please provide the client first name",
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
      },
      'ui:description': "Please provide the client Lastname",
    },
    country: {
      'ui:widget': 'SelectWithDataWidget',
      'ui:options': {
        multiSelect: false,
        query: `query LasecGetCustomerCountries {
          LasecGetCustomerCountries {
            id
            key
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