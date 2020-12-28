
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
        freightFor: { sm: 4, xs: 12 },
        offloadRequired: { sm: 4, xs: 12 },
        hazardous: { sm: 4, xs: 12 },
        refrigerationRequired: { sm: 4, xs: 12 },
        containsLithium: { sm: 4, xs: 12 },
        sample: { sm: 4, xs: 12 },
        // additionalDetails: { xs: 12 },
      },
    ],
    id: {},
    freightFor: {
      'ui:widget': 'RadioGroupComponent',
      'ui:options': {
        label: 'Request Freight for:',
        radioOptions: [
          {
            key: 'line-item',
            value: 'line-item',
            label: 'Line Item',
          },
          {
            key: 'full-consignment',
            value: 'full-consignment',
            label: 'Full Consignment',
          },
        ]
      },
      propsMap: {
        'formData': 'formData',
        'formContext.$formData.freightFor': 'formData',
      },
    },
    offloadRequired: {},
    hazardous: {
      'ui:widget': 'RadioGroupComponent',
      'ui:options': {
        label: 'Hazardous?',
        radioOptions: [
          {
            key: 'hazardous',
            value: 'hazardous',
            label: 'Hazardous',
          },
          {
            key: 'non-hazardous',
            value: 'non-hazardous',
            label: 'Non Hazardous',
          },
        ]
      },
      propsMap: {
        'formData': 'formData',
        'formContext.$formData.hazardous': 'formData',
      },
    },
    refrigerationRequired: {},
    containsLithium: {},
    sample: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        renderAsOptions: true,
        selectOptions: [
          { key: 'sample', value: 'sample', label: 'Sample' },
          { key: 'repair', value: 'repair', label: 'Repair' },
        ],
      },
    },
    // additionalDetails: {},
  };
  