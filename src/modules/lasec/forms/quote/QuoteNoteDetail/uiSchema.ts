export default {
  showSubmit: false,
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      note: {
        md: 12, sm: 12, xs: 12,
      },
    },
  ],
  notes: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.notes}',
      variant: 'subtitle1',
      title: 'Reminder',
    }
  },
};
