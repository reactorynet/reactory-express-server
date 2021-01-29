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
        clientTitle: { xs: 12, sm: 12,  md: 6, lg: 4 },
        firstName: { xs: 12, sm: 12, md: 6, lg: 8 },
        lastName: { xs: 12, sm: 12, md: 6, lg: 6 },
        country: { xs: 12, sm: 12, md: 6, lg: 6 },
        accountType: { xs: 12, sm: 12, md: 6, lg: 6 },
        repCode: { xs: 12, sm: 12, md: 6, lg: 6 },
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
        },
        labelStyle: {        
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
        },                
      },
      'ui:description': "Please provide the client first name",
    },
    lastName: {
      'ui:options': {
        component: 'TextField',
        componentProps: {
          variant: 'outlined',
          placeholder: 'Last Name',          
        },        
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
