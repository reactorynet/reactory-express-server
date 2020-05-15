

const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:options': {
    toolbarPosition: 'top',
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
      id: { xs: 12 },
      tabs: { xs: 12 },
    },
  ],
  id: {
    'ui:options': {
      componentFqn: 'lasec-crm.LasecClientOverviewWidget@1.0.0',
      componentPropsMap: {
        'formContext.formData.id': 'formData.id',
      }
    }
  },
  tabs: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      activeTab: '${formContext.$route.match.params.tab}',
    }
  },
};

export default uiSchema;
