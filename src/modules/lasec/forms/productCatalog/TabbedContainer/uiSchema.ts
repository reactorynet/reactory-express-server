
// const $toolbar: any = {
//   'ui:wrapper': 'Toolbar',
//   'ui:widget': 'MaterialToolbar',
//   'ui:field': 'GridLayout',
//   'ui:grid-layout': [
//     {
//       product: { md: 3, sm: 4, xs: 6 },
//       supplier: { md: 3, sm: 4, xs: 6 },
//       submitButton: { md: 3, sm: 4, xs: 6 },
//     }
//   ],
//   product: {
//     'ui:widget': 'InputWidget',
//     'ui:options': {
//       icon: 'search',
//       placeholder: 'Find a Product'
//     }
//   },
//   submitButton: {
//     'ui:widget': 'FormSubmitWidget',
//     'ui:options': {
//       text: 'SEARCH',
//     }
//   }
// }
const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 4,
  },
  'ui:grid-layout': [
    // {
    //   toolbar: { xs: 12 },
    // },
    {
      tabs: { xs: 12 },
    },
  ],
  // toolbar: $toolbar,
  tabs: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      tabs: [
        // {
        //   title: 'Product Overview',
        //   componentFqn: 'lasec-crm.LasecProductOverviewTable',
        //   componentProps: {
        //     query: {
        //       product: 'formData.product',
        //     }
        //   },
        // },
        // {
        //   title: 'Product Pricing',
        //   componentFqn: 'lasec-crm.LasecProductPricingTable',
        //   componentProps: {
        //     query: {
        //       product: 'formData.product',
        //     }
        //   },
        // },
        // {
        //   title: 'More Details',
        //   componentFqn: 'lasec-crm.LasecProductDetailTable',
        //   componentProps: {
        //     query: {
        //       product: 'formData.product',
        //     }
        //   },
        // },
        {
          title: 'Dimensions',
          componentFqn: 'lasec-crm.LasecProductDetailTable',
          componentProps: {
            query: {
              product: 'formData.product',
            }
          },
        },
      ]
    }
  },

};

export default uiSchema;
