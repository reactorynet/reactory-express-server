
// add ui schemas in this file.
export default {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      forms: { xs: 12, lg: 12 }
    }
  ],
  forms: {
    title: 'Reactory Forms',
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Form Id',
          field: 'id',
          component: 'core.Link@1.0.0',
          props: {
            link: '/${formContext.root_path}\/${rowData.nameSpace}.${rowData.name}@${rowData.version}\/',
            uiSchema: {
              'ui:options': {
                format: '/${formContext.root_path}\/${rowData.nameSpace}.${rowData.name}@${rowData.version}\/',
                title: '${rowData.nameSpace}.${rowData.name}@${rowData.version}',
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
      actions: [{
        icon: 'aadd',
        tooltip: 'ADD NEW FORM',
        iconProps: {
          color: 'success'
        },
        variables: {
          'selected': 'newClient.organization',
        },
        isFreeAction: true,
        event: {
          name: 'onNewFormClicked',
          via: 'form',
        }
      },],
      title: 'Reactory Forms',
    },
  },
};