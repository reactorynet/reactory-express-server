
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: false,
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
      email: { sm: 6, xs: 12 },
      communicationMethod: { sm: 6, xs: 12 },
    },
    {
      options: { md: 6, xs: 12 },
    },
    {
      productDetails: { md: 6, xs: 12 },
    },
  ],
  code: {
    'ui:widget': 'HiddenWidget',
  },
  email: {},
  communicationMethod: {
    'ui:widget': 'RadioGroupComponent',
    'ui:options': {
      label: 'How would you like to send Quote Options?',
      radioOptions: [
        {
          key: 'link_360',
          value: 'link_360',
          label: 'Link to 360',
        },
        {
          key: 'attach_pdf',
          value: 'attach_pdf',
          label: 'Attach as PDF',
        },
      ]
    },
    propsMap: {
      'formData': 'formData',
      'formContext.$formData.communicationMethod': 'formData',
    },
  },
  options: {
    'ui:widget': 'FreightRequestWidget',
    'ui:options': {
      props: {
        components: [
          { componentFqn: 'lasec-crm.LasecFreightRequestOptionForm' },
          { componentFqn: 'lasec-crm.LasecFreightRequestCosigneeForm' },
          { componentFqn: 'lasec-crm.LasecFreightRequestConsignmentForm' },
          { componentFqn: 'lasec-crm.LasecFreightRequestProductDetail' },
        ]

      },
      // componentPropsMap: {
      //   'formContext.$formData.options': 'formData.options',
      //   'formData': 'formData.options',
      // },
      // propsMap: {
      //   'formData': 'formData.options',
      // }
    },
  },
  // productDetails: {
  //   'ui:widget': 'ProductDetailWidget',
  //   'ui:options': {
  //     props: {},
  //     componentPropsMap: {
  //       'formContext.$formData.productDetails': 'formData.productDetails',
  //       'formData': 'formData.productDetails',
  //     },
  //     propsMap: {
  //       'formData': 'formData.productDetails',
  //     }
  //   }
  // }
};

export default uiSchema;
