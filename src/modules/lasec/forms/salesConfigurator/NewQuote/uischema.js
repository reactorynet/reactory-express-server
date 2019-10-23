export default {
  client: {},
  client: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'planned', value: 'planned', label: 'Planned' },
        { key: 'in-progress', value: 'in-progress', label: 'In Progress' },
        { key: 'complete', value: 'complete', label: 'Complete' },
        { key: 'outputs', value: 'outputs', label: 'Outputs' },
        { key: 'Kudos', value: 'kudos', label: 'Kudos' },
      ],
    },
  },
  date: {
    'ui:widget': 'DateSelectorWidget',
  },
  poNumber: {}
};
