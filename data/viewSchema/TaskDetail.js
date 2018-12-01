export default {
  id: {
    'ui:widget': 'HiddenWidget',
  },
  project: {
    'ui:widget': 'RecordLookupWidget',
  },
  percentComplete: {
    'ui:widget': 'SliderWidget',
    'ui:options': {
      container: 'core.BasicContainer',
      containerProps: {
        title: 'Percent Complete',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },
  },
  priority: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'critical', value: 'critical', label: 'Critical' },
        { key: 'high', value: 'high', label: 'High' },
        { key: 'medium', value: 'medium', label: 'Medium' },
        { key: 'low', value: 'low', label: 'Low' },
      ],
    },
  },
  taskType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'normal', value: 'normal', label: 'Normal' },
        { key: 'milestone', value: 'milestone', label: 'Milestone' },
      ],
    },
  },
  description: {
    'ui:widget': 'FroalaEditor',
  },
  labels: {
    'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      container: 'core.BasicContainer',
      containerProps: {
        title: 'Task Labels',
        style: {
          maxWidth: '100%',
          justifyContent: 'flex-end',
        },
      },
    },
  },
  assignedTo: {
    'ui:widget': 'UserSearch',
  },
};
