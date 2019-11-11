
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
              
            },
            schema: {
              type: "string",
              title: ""
            },
            idSchema: {
              $id: "categoryFilterList_selectmultiple"
            }
          },
          propsMap: {
            "seletMultiple": 'formData',
          },
        },        
        // {
        //   title: 'Select Multiple',
        //   field: 'id',
        //   'ui:widget': 'core.LabelWidget@1.0.0',
        //   'ui:options': {
        //     format: 'Test ${id}',
        //   }
        // },
        // {
        //   title: 'Select Multiple',
        //   field: 'id',
        //   component: 'core.LabelWidget@1.0.0',
        //   props: {
        //     uiSchema: {
        //       'ui:options': {
        //         format: 'Test ${id}',
        //       },
        //     },
        //   },
        // },
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
