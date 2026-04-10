


export default {
  'ui:options': {},
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      requestType: { xs: 12, lg: 6 },
      request: { xs: 12, lg: 6 },
    },
    {
      description: { xs: 12, lg: 12 },
    }
  ],
  requestType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      showLabel: true,
      selectOptions: [
        { key: 'general', value: 'general', label: 'General', icon: 'question-circle' },
        { key: 'bug', value: 'bug', label: 'Bug / Error', icon: 'bug' },
        { key: 'feature-request', value: 'feature-request', label: 'Feature Request', icon: 'lightbulb' },
        { key: 'billing', value: 'billing', label: 'Billing', icon: 'money' },
        { key: 'account', value: 'account', label: 'Account & Access', icon: 'user' },
        { key: 'performance', value: 'performance', label: 'Performance', icon: 'dial' },
        { key: 'integration', value: 'integration', label: 'Integration', icon: 'puzzle-piece' },
        { key: 'documentation', value: 'documentation', label: 'Documentation', icon: 'book' },
        { key: 'security', value: 'security', label: 'Security', icon: 'shield' },
        { key: 'other', value: 'other', label: 'Other', icon: 'ellipsis-h' },                
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
}