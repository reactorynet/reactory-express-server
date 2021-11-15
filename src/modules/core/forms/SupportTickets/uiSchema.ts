
const uiSchema: any = {
  'ui:options': {
    showSubmit: false
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      message: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
      tickets: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  message: { 
    'ui:widget': 'StaticContent',
    'ui:title': '',
    'ui:options': {
      showTitle: false,
      slug: "support-tickets-welcome-header"
    }
  },
  tickets: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'ID', field: 'id' },
        { title: 'Status', field: 'status' },
      ]
    }
  }
};

export default uiSchema;