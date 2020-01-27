export default {
  showSubmit: false,
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      notes: {
        md: 12, sm: 12, xs: 12,
      },
    },
  ],
  notes: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: '',
      renderHtml: true
    }
  },
};
