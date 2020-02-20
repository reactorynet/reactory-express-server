
const $toolbar: any = {
  'ui:wrapper': 'Toolbar',
  'ui:widget': 'MaterialToolbar',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      product: { md: 3, sm: 4, xs: 6 },
      // supplier: { md: 3, sm: 4, xs: 6 },
      submitButton: { md: 3, sm: 4, xs: 6 },
      resultCount: { md: 3, sm: 4, xs: 6 },
      view: { md: 3, sm: 4, xs: 6 },
    }
  ],  
  product: {
    'ui:widget': 'InputWidget',
    'ui:options': {
      icon: 'search',
      placeholder: 'Find a Product',
      inputProps: {
        variant: 'outline',
        type: 'search',
        styles: {
          minWidth: '180px'
        }
      }      
    }
  },
  submitButton: {
    'ui:widget': 'FormSubmitWidget',
    'ui:options': {
      text: 'SEARCH',
      props: {
        styles: {
          maxWidth: '180px'
        }
      }
    }
  },
  resultCount: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: '',
    }
  },
  view: {
    'ui:widget': 'SchemaSelectorWidget',
  }
};


const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:options': {
    toolbarPosition: 'top|bottom',
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 4,
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
            query: {
              product: 'formData.product',
            }
          },
          componentPropsMap: {
            'formData.product': 'formData.product',
            'formData.view': 'query.uiSchema'
          },
        },
        {
          title: 'Product Pricing',
          componentFqn: 'lasec-crm.LasecProductPricingTable',
          componentProps: {
            query: {
              product: 'formData.product',
            }
          },
        },
        {
          title: 'More Details',
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
