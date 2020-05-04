
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
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary'
    },
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
          id: 'product-overview',
          title: 'Product Overview',
          componentFqn: 'lasec-crm.LasecProductOverviewTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-pricing',
          title: 'Product Pricing',
          componentFqn: 'lasec-crm.LasecProductPricingTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-more-details',
          title: 'More Details',
          componentFqn: 'lasec-crm.LasecProductDetailTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-dimensions',
          title: 'Dimension',
          componentFqn: 'lasec-crm.LasecProductDetailTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-stock',
          title: 'Stock',
          componentFqn: 'lasec-crm.LasecProductDetailTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-sales-order',
          title: 'Sales Order',
          componentFqn: 'lasec-crm.LasecProductSalesOrders',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },        
        {
          id: 'product-contracts',
          title: 'Contracts',
          componentFqn: 'lasec-crm.LasecProductContracts',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-tenders',
          title: 'Tenders',
          componentFqn: 'lasec-crm.LasecProductTenders',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          id: 'product-costings',
          title: 'Costings',
          componentFqn: 'lasec-crm.LasecProductCostings',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
      ]
    }
  },

};

export default uiSchema;
