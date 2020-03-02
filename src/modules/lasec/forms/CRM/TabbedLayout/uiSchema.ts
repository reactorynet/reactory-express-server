
const $toolbar: any = {
  'ui:wrapper': 'Toolbar',
  'ui:widget': 'MaterialToolbar',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      search: { md: 3, sm: 4, xs: 6 },
      // supplier: { md: 3, sm: 4, xs: 6 },
      fabButton: { md: 3, sm: 4, xs: 6 },
    }
  ],
  search: {
    'ui:options': {
      showLabel: true,
      icon: 'search',
      component: "TextField",
      props: {
        placeholder: 'Search',
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  fabButton: {
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
};


const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:options': {
    toolbarPosition: 'none',
    showRefresh: false,
    showSubmit: false,
    schemaSelectorStyle: 'icon-button',
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
      activeTab: '${formContext.$route.match.params.tab}',
      /*
      tabs: [
        {
          title: 'Product Overview',
          componentFqn: 'lasec-crm.LasecProductOverviewTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          title: 'Product Pricing',
          componentFqn: 'lasec-crm.LasecProductPricingTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
        {
          title: 'More Details',
          componentFqn: 'lasec-crm.LasecProductDetailTable',
          componentProps: {},
          componentPropsMap: {
            'formContext.$formData.toolbar.product': 'formData.product',
            'formContext.$formData.toolbar.view': 'query.uiSchema',
          },
        },
      ]
      */
    }
  },

};

export default uiSchema;
