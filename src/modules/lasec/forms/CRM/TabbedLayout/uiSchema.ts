
const $toolbar: any = {
  'ui:wrapper': 'Toolbar',
  'ui:widget': 'MaterialToolbar',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {      
      // search: { md: 3, sm: 4, xs: 6 },
      // supplier: { md: 3, sm: 4, xs: 6 },      
      // view: { md: 1, sm: 1, xs: 1 },
      fabButton: { md: 12, sm: 12, xs: 12, alignItems: 'right' },
    }
  ],
  'ui:grid-options': {

  },
  
  fabButton: {
    'ui:widget': 'CRMToolbar',
    /*
    'ui:options': {
      props: {
        componentFqn: 'lasec-crm.LasecCRMNewClient@1.0.0',
        componentProps: {
         
        },
        slideDirection: 'down',                
        buttonVariant: 'Fab',
        buttonProps: {
          size: 'small',
          style: {
            color: "#ffffff",
            marginLeft: '16px',
            backgroundColor: "#000000"
          }
        },
        buttonIcon: 'add',                
        windowTitle: 'Add New Client',
      },
      propertyMap: {

      },
      fullWidth:false,
      style: {
        float: 'right'
      }
    }
    */      
  },
  view: {
    'ui:widget': 'HiddenWidget',
    //'ui:widget': 'SchemaSelectorWidget',
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
    componentType: "div",
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
      position: "absolute",
      top: "54px",
      left: "0",
      right: "0",
      bottom: "0",      
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 0,
    containerStyles: {
      border: "none",
      boxShadow: "none",
      padding: '8px'
    }

  },
  'ui:grid-layout': [   
    {
      tabs: { xs: 12 },
    },
  ],
  toolbar: $toolbar,
  tabs: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      numberOfVisibleTabs: 5,
      activeTab: '${formContext.$route.params.tab}',
      buttons: [
        'lasec-crm.CRMToolbar@1.0.0'
      ]      
    }
  },

};

export default uiSchema;
