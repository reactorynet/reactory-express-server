
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
      email: { xs: 12, sm: 6, md: 6, lg: 6 },
      communicationMethod: { xs: 12, sm: 6, md: 6,  lg: 6 },
    },
    {
      details: { xs: 12, sm: 12, md: 12, lg: 12 },
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
  details: {
    'ui:widget': 'FreightRequestWidget',
    'ui:options': {
      props: {
        optionsComponents: [
          { componentFqn: 'lasec-crm.LasecFreightRequestOptionForm' },
          { componentFqn: 'lasec-crm.LasecFreightRequestCosigneeForm' },
          { componentFqn: 'lasec-crm.LasecFreightRequestConsignmentForm' }
        ],
        productComponent: {
          componentFqn: 'lasec-crm.LasecFreightRequestProductDetail',
        }
      },
      propsMap: {
        'formContext.$formData': 'formData',
        'formData': 'formData',
      }
    },
  },
};

export default uiSchema;
