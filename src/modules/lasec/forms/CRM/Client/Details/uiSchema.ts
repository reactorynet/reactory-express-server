

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
      activeColor: 'secondary',
    },
    componentType: "div",
    container: "div",
    style: {
      backgroundColor: "#e6e6e6",
      paddingLeft: "16px",
      paddingRight: "16px"
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 4,
    containerStyles: {
      backgroundColor: "#e6e6e6",
      border: "none",
      boxShadow: "none"
    }

  },
  'ui:grid-layout': [
    {
      client: { xs: 12 },
      tabs: { xs: 12 },
    },
  ],
  client: {
    'ui:widget': 'LasecClientOverviewHeaderForm',
  },
  tabs: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      activeTab: 'clientsDetails',
      numberOfVisibleTabs: 2,
      tabMenuLabel: 'Client Activity'
    }
  },
};

export default uiSchema;
