
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
      email: { md: 6, xs: 12 },
      // communicationOptions: { md: 6, xs: 12 },
    },
    {
      options: { md: 6, xs: 12 },
    },
  ],
  code: {
    'ui:widget': 'HiddenWidget',
  },
  email: {},
  // communicationOptions: {},
  options: {
    'ui:widget': 'FreightRequestWidget',
    'ui:options': {
      props: {
        componentFqn: 'lasec-crm.LasecFreightRequestOptionForm@1.0.0',
        componentProps: {},
      },
      componentPropsMap: {
        'formContext.$formData.options': 'formData.options',
        'formData': 'formData.options',
      },
      propsMap: {
        'formData': 'formData.options',
      }
    },
    // propsMap: {
    //   'formData': 'options',
    // }
  },
};

export default uiSchema;
