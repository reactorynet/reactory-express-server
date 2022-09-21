
const uiSchema: Reactory.Schema.IFormUISchema = {
  // 'ui:field': 'GridLayout',
  // 'ui:grid-layout': [
  //   {    
  //     applications: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
  //   }
  // ],
  'ui:options': {},
  applications: {
    'ui:options': {
      allowAdd: true,
      allowDelete: false,
    }
  },
  "ui:form": {
    showSubmit: false,
    showHelp: true,
    showRefresh: true,
  },
};



export default uiSchema;