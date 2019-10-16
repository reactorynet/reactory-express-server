
  // add ui schemas in this file.
  export default {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        forms: { xs: 12, lg: 12 }
      }
    ],    
    forms:  {
      title: 'Reactory Forms',
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columns: [          
          {
            title: 'Form Id',
            field: 'id',
            component: 'core.Link@1.0.0',
            props: {
              link: '/reactory\/${id}\/',
              uiSchema: {
                'ui:options': {
                  format: '/reactory\/${id}\/',
                  title: '${id}',
                  userouter: false,
                },
              },              
            },
          },
          { title: 'Name', field: 'name' },
          { title: 'NameSpace', field: 'nameSpace', defaultGroupOrder: 0 },
          { title: 'version', field: 'version' },                    
        ],
        options: {
          grouping: true,
        },
        title: 'Reactory Forms',
      },
    },
  };