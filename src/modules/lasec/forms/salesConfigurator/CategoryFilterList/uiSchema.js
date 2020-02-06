
export default {
  submitIcon: 'refresh',
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
          component: 'core.LabelWidgetComponent@1.0.0',
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
  addNew: {
    'ui:options': {
      componentFqn: 'core.SlideOutLauncher',
      componentProps: {
        buttonVariant: 'SpeedDial',
        componentFqn: 'lasec-crm.CreateCategoryFilter@1.0.0',
        componentProps: {
          'addNew': ['query.filter_id']
        },
        actions: [
          {
            key: 'new-filter',
            title: 'New Filter',
            clickAction: 'launch-slideout',
            icon: 'create',
            enabled: true,
            ordinal: 0,
          }
        ]
      }
    }
  }
};
