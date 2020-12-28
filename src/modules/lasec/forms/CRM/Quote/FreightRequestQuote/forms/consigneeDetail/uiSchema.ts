
export const uiSchema: any = {
    'ui:options': {
      toolbarPosition: 'none',
      componentType: "div",
      container: "div",
      showSubmit: false,
      showRefresh: false,
      containerStyles: {
        padding: '0px',
        marginTop: '16px',
        boxShadow: 'none'
      },
      style: {
        marginTop: '16px'
      }
    },
    'ui:titleStyle': {
      borderBottom: '2px solid #D5D5D5',
      marginBottom: '1.5rem',
      paddingBottom: '0.3rem'
    },
    'ui:field': 'GridLayout',
    'ui:grid-options': {
      container: 'div',
      containerStyle: {}
    },
    'ui:grid-layout': [
      {
        companyName: { sm: 6, xs: 12 },
        streetAddress: { sm: 6, xs: 12 },
        suburb: { sm: 6, xs: 12 },
        city: { sm: 6, xs: 12 },
        province: { sm: 6, xs: 12 },
        country: { sm: 6, xs: 12 },
      },
    ],
    id: {},
    companyName: {},
    streetAddress: {},
    suburb: {},
    city: {},
    province: {},
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