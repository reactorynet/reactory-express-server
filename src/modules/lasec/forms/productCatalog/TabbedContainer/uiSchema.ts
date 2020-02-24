
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
    'ui:options': {
      showLabel: true,
      icon: 'search',     
      component: "TextField",       
      props: {        
        placeholder: 'Find a Product',
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }      
    }
  },
  submitButton: {
    'ui:widget': 'FormSubmitWidget',
    'ui:options': {
      text: 'SEARCH',
      color: 'default',
      props: {
        color: 'default',
        style: {
          maxWidth: '180px',
          width: '180px'
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
    'ui:options': {
      style: {
        width: 'unset',
        float: 'right'
      },
    }    
  }
};


const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:options': {
    toolbarPosition: 'none',
    showRefresh: false,
    showSubmit: false,
    schemaSelectorStyle: 'button',
    style: {
      backgroundColor: "#F6F6F6",
      position: "absolute",
      top: "54px",
      left: "0",
      right: "0",
      bottom: "0",
      paddingLeft: "16px",
      paddingRight: "16px"
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 4,    
    containerStyles: {
      backgroundColor: "#F6F6F6",
      border: "none",
      boxShadow: "none"
    }

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
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': ['formData.product', 'query.product'],
            'formContext.$formData.toolbar.view': 'query.uiSchema',
            'formContext.$formState.autoQueryDisabled' : 'autoQueryDisabled',
          },
        },
        {
          title: 'Product Pricing',
          componentFqn: 'lasec-crm.LasecProductPricingTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': ['formData.product', 'query.product'],
            'formContext.$formData.toolbar.view': 'query.uiSchema',
            'formContext.$formState.autoQueryDisabled' : 'autoQueryDisabled',
          },
        },
        {
          title: 'More Details',
          componentFqn: 'lasec-crm.LasecProductDetailTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': ['formData.product', 'query.product'],
            'formContext.$formData.toolbar.view': 'query.uiSchema',
            'formContext.$formState.autoQueryDisabled' : 'autoQueryDisabled',
          },
        },
      ]
    }
  },

};

export default uiSchema;
