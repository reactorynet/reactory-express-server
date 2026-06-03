const BaseUISchema: Reactory.Schema.IFormUISchema = {
  "ui:form": {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: "top",
    toolbarStyle: {
      display: "flex",
      justifyContent: "flex-end",
    },
    showSchemaSelectorInToolbar: true,
    schemaSelector: {
      variant: "icon-button",
    },
  },
  // @ts-ignore
  "ui:title": {
    jss: {
      paddingLeft: "24px",
    },
  },
  "ui:field": "GridLayout",
  "ui:grid-layout": [
    {
      workflow: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
  ],
  "workflow": {
    "ui:widget": "WorkflowDetailsWidget",
  }
};
