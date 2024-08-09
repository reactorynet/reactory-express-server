import Reactory from "@reactory/reactory-core";


const greetingUISchemaOptions: Reactory.Schema.IUIUTextFieldOptions = {
  multiline: true,  
}

const greetingUISchema: Reactory.Schema.IUISchema = {
  "ui:options": greetingUISchemaOptions,
  "ui:widget": "LabelWidget"
}

const uiSchema: Reactory.Schema.IFormUISchema = {
  "ui:form": {
    showSubmit: false,
    showHelp: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',  
  'ui:grid-layout': [
    { 
      greeting: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
      applications: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  'ui:options': {},
  greeting: greetingUISchema,
  applications: {  
    'ui:options': {
      allowAdd: false,
      allowDelete: false,
      allowReorder: false,
      showLabel: false,
      container: 'div',
      containerProps: {}
    },    
    items: {
      'ui:widget': 'core.ApplicationCard@1.0.0',
      'ui:options': {
        size: { xs: 12, sm: 12, md: 6, lg: 4, xl: 3 },
        moreRoute: "/applications/${id}"
      }
    }
  },
  
};



export default uiSchema;