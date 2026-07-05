import Reactory from "@reactorynet/reactory-core";

const uiSchema: Reactory.Schema.IFormUISchema = {
   'ui:form': {
    componentType: "div",
    showSubmit: true,
    showHelp: false,
    showRefresh: false,
    toolbarPosition: "bottom",
    toolbarStyle: {
      display: 'flex',
      justifyContent: 'flex-end',
      paddingTop: '16px',
     },
    submitProps: {
      //titleText: "reactory:support-ticket.submit.title-text"
    },
    style: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px 0',
     },
   },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
    spacing: 3,
    containerStyles: {
      display: 'flex',
      flexDirection: 'column',
     },
   },
  'ui:grid-layout': [
     {
      requestType: { xs: 12, sm: 6, md: 6, lg: 6 },
      request: { xs: 12, sm: 6, md: 6, lg: 6 },
     },
     {
      description: { xs: 12, sm: 12, md: 12, lg: 12 },
     }
    ],
   requestType: {
     'ui:widget': 'SelectWidget',
     'ui:options': {
      showLabel: true,
      selectOptions: [
         { key: 'general', value: 'general', label: 'General', icon: 'help' },
         { key: 'bug', value: 'bug', label: 'Bug / Error', icon: 'pest-control' },
         { key: 'feature-request', value: 'feature-request', label: 'Feature Request', icon: 'lightbulb' },
         { key: 'billing', value: 'billing', label: 'Billing', icon: 'money' },
         { key: 'account', value: 'account', label: 'Account & Access', icon: 'manage-accounts' },
         { key: 'performance', value: 'performance', label: 'Performance', icon: 'speed' },
         { key: 'integration', value: 'integration', label: 'Integration', icon: 'import-export' },
         { key: 'documentation', value: 'documentation', label: 'Documentation', icon: 'book' },
         { key: 'security', value: 'security', label: 'Security', icon: 'shield' },
         { key: 'other', value: 'other', label: 'Other', icon: 'abc' },
        ],
     }
    },
   request: {},
   description: {
     'ui:widget': 'RichEditorWidget',
     'ui:title': null,
     'ui:options': {
      showLabel: false,
     },
    },
};

export default uiSchema;
