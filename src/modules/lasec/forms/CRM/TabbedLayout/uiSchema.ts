
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
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Search',
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  fabButton: {
    'ui:widget': 'LinkFieldWidget',
    'ui:options': {
      format: '/', //eslint-disable-line
      component: 'fab',
      title: '',
      icon: 'add',      
      iconProps: {
        color: 'primary',
        style: {
        },
      },
      userouter: true, // use browser navigator
    },
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
    }
  },

};

export default uiSchema;
