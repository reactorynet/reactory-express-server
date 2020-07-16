
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: true,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      marginTop: '16px'
    },
    style: {
      marginTop: '16px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      code: { md: 6, xs: 12 },
      options: { md: 6, xs: 12 },
    },
  ],
  code: {},
  options: {
    'ui:widget': 'FreightRequestWidget',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer'
    },
    props: {
      // componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      // componentProps: {},
    },
  },
};

export default uiSchema;
