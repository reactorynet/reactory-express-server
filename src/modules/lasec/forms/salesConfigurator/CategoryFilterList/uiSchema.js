
export default {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      filters: { sm: 12, md: 12 },
    }
  ],
  filters: {
    title: 'Filter List',
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Title', field: 'title' },
        { title: 'Key', field: 'key' },
        // { title: 'Select Multiple', field: 'selectMultiple' },
      ],
      options: {},
      title: 'Category Filters',
    },
  },
};
