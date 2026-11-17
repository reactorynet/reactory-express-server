export const argsUiSchema = {

}


export default {
  'ui:options': {},
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      BooleanProperty: { xs: 12, lg: 12 },
      StringProperty: { xs: 12, lg: 12 },      
    }
  ],
  BooleanProperty: {},
  StringProperty: {
    'ui:widget': 'RichEditorWidget',
  },  
}