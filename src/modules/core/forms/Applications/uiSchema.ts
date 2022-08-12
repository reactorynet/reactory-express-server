
const uiSchema: Reactory.Schema.IFormUISchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      message: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
      applications: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  'ui:options': {},
  message: {
    
  },
  applications: {
    'ui:options': {
      allowAdd: true
    }
  },
  "ui:form": {
    showSubmit: false,
    showHelp: true,
    showRefresh: true
  },
};



export default uiSchema;