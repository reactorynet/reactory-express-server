
const $toolbar: any = {
  'ui:wrapper': 'Toolbar',
  'ui:widget': 'MaterialToolbar',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      product: { md: 3, sm: 4, xs: 6 },
      supplier: { md: 3, sm: 4, xs: 6 },
      submitButton: { md: 3, sm: 4, xs: 6 },
    }
  ],
  product: {
    'ui:widget': 'InputWidget',
    'ui:options': {
      icon: 'search',
      placeholder: 'Find a Product'
    }
  },
  supplier: {
    'ui:widget': 'InputWidget',
    'ui:options': {
      icon: 'search',
      placeholder: 'Find a Suplier'
    }
  },
  submitButton: {
    'ui:widget': 'FormSubmitWidget',
    'ui:options': {
      text: 'SEARCH',
    }
  }
}

const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    // spacing: 4,
  },
  'ui:grid-layout': [
    {
      toolbar: { xs: 12 },
    },
    {
      tabs: { xs: 12 },
    },
  ],
  toolbar: $toolbar,
  tabs: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      tabs: [
        {
          title: 'Product Overview',
          componentFqn: 'lasec-crm.LasecProductOverviewTable',
          componentProps: {
            // query: {
            //   filterType: 'Recent'
            // }
          },
          // additionalComponents: [
            // {
            //   componentFqn: 'core.SlideOutLauncher',
            //   componentProps: {
            //     buttonVariant: 'SpeedDial',
            //     actions: [
            //       {
            //         key: 'new-quote',
            //         title: 'New Quote',
            //         clickAction: 'navigate',
            //         link: '/newquote/',
            //         icon: 'create',
            //         enabled: true,
            //         ordinal: 0,
            //         eventHandler: 'toBeImplemented'
            //       },
            //       {
            //         key: 'search-procducts',
            //         title: 'Search Products',
            //         clickAction: 'navigate',
            //         link: '/productlist/',
            //         icon: 'search',
            //         enabled: true,
            //         ordinal: 2,
            //         eventHandler: 'toBeImplemented'
            //       }
            //     ]
            //   }
            // }
          // ]
        },
      ]
    }
  },

};

export default uiSchema;
