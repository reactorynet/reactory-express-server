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
    showHelp: false,
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
    'ui:title': null,      
    'ui:options': {
      allowAdd: false,
      allowDelete: false,
      allowReorder: false,
      showTitle: false,
      showDescription: false,
      enableDragAndDrop: false,
      showLabel: false,
      showToolbar: false,
      container: 'Grid',
      containerProps: {
        size: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
        container: true,
        spacing: 2,
        rowSpacing: 2,
        columnSpacing: 2,
        sx: {
          alignItems: 'stretch',
          justifyContent: 'flex-start',          
        },
        // wrap: 'wrap',
      },
      itemsContainer: 'Grid',
      itemsContainerProps: {
        size: { xs: 12, sm: 12, md: 6, lg: 4, xl: 4 },
        spacing: 2,
        rowSpacing: 2,
        columnSpacing: 2,
        item: true,
        sx: {
          alignItems: 'stretch',
          justifyContent: 'flex-start', 
          display: 'flex',
          flexDirection: 'row',                 
        },
        // wrap: 'wrap',  
      }
    },    
    items: {
      'ui:widget': 'core.ApplicationCard@1.0.0',
      'ui:options': {
        size: { xs: 12, sm: 12, md: 6, lg: 4, xl: 4 },
        sx: { padding: 1, margin: 1 }, 
        moreRoute: "/applications/${id}?tab=overview"
      }
    }
  },
  
};



export default uiSchema;