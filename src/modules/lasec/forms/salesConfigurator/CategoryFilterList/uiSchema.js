
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
        { title: 'Slug', field: 'key' },
        {
          title: 'Select Multiple',
          field: 'selectMultiple',
          component: 'core.Label@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                format: '${selectMultiple == true ? "YES" : "NO"}',
              }
            },
            variant: 'p'
          },
          propsMap: {
            seletMultiple: 'value',
          }
        },
        {
          title: 'Filter Options',
          field: 'id',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.CreateCategoryFilter@1.0.0',
            componentProps: {
              'id': ['query.filter_id']
            },
            slideDirection: 'Up',
            buttonTitle: 'View Filter Options',
            windowTitle: 'Edit Category Filters',
          },
        },
      ],
      options: {},
      title: 'Category Filters',
    },
  },
};
