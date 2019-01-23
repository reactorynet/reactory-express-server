export const DefaultUiSchema = {
  submitIcon: 'done_outline',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      project: { md: 6 },
      board: { md: 6 },
      title: { md: 6 },
      priority: { md: 3 },
      effortEstimate: { md: 3 },
    },
    {
      description: { md: 8, sm: 12 },
      percentComplete: { md: 4, sm: 12 },
    },
    {
      status: { md: 6, sm: 12 },
      workflowStatus: { md: 6, sm: 12 },
      startDate: { md: 6, sm: 12 },
      endDate: { md: 6, sm: 12 },
    },
    {
      taskType: { md: 3 },
      taskCost: { md: 3 },
      effortEstimate: { md: 3 },
      currency: { md: 3 },
    },
  ],
  id: {
    'ui:widget': 'HiddenWidget',
  },
  project: {
    // 'ui:widget': 'HiddenWidget',
  },
  board: {
    // 'ui:widget': 'HiddenWidget',
  },
  effortEstimate: {
    // 'ui:widget': 'HiddenWidget',
  },
  currencyEstimate: {
    // 'ui:widget': 'HiddenWidget',
  },
  currency: {
    // 'ui:widget': 'HiddenWidget',
  },
  taskCost: {
    // 'ui:widget': 'HiddenWidget',
  },
  startDate: {
    'ui:widget': 'DateSelectorWidget',
  },
  endDate: {
    'ui:widget': 'DateSelectorWidget',
  },
  status: {
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
      renderAsOptions: true,
      selectOptions: [
        { key: 'task', value: 'task', label: 'Task' },
        { key: 'milestone', value: 'milestone', label: 'Milestone Task' },
      ],
    },
  },
  milestone: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'new', value: 'new', label: 'New' },
      ],
    },
  },
  description: {
    'ui:widget': 'FroalaWidget',
    'ui:options': {
      froalaOptions: {
        charCounterMax: 500,
        toolbarInline: true,
        // toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
        // toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
        fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
        videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
        imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
        requestHeaders: {
          'x-client-key': '${formContext.api.CLIENT_KEY}',
          'x-client-pwd': '${formContext.api.CLIENT_PWD}',
        },
      },
    },
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
  percentComplete: {
    'ui:widget': 'ProgressWidget',
    'ui:options': {
      size: 80,
      thickness: 5,
      variant: 'static',
    },
  },
  workflowStatus: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'new', value: 'new', label: 'New' },
      ],
    },
  },
  user: {
    'ui:widget': 'UserWidgetWithSearch',
    'ui:options': {
      widget: 'UserWidgetWithSearch',
      propertyMap: {
        'formData.assignedTo': 'user.id',
      },
      lookupWidget: 'core.UserSearch',
      lookupOnSelect: 'onSelect',
    },
  },
};

export const DetailedUiSchema = {
  ...DefaultUiSchema,
  id: {
    'ui:widget': 'HiddenWidget',
  },
  project: {
    // 'ui:widget': 'HiddenWidget',
  },
  board: {
    // 'ui:widget': 'HiddenWidget',
  },
  effortEstimate: {
    // 'ui:widget': 'HiddenWidget',
  },
  currencyEstimate: {
    // 'ui:widget': 'HiddenWidget',
  },
  currency: {
    // 'ui:widget': 'HiddenWidget',
  },
  taskCost: {
    // 'ui:widget': 'HiddenWidget',
  },
};

export default DefaultUiSchema;
