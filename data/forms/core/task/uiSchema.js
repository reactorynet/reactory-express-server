export const DefaultUiSchema = {
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
        //charCounterMax: 500,
        toolbarInline: true,
        //toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'insertTable', 'html'],
        //toolbarButtonsXS: ['undo', 'redo', '-', 'bold', 'italic', 'underline'],
        fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file?storage=azure',
        videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video?storage=azure',
        imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image?storage=azure',        
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
    'ui:widget': 'SliderWidget',
  },
  workflowStatus: {

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
    //'ui:widget': 'HiddenWidget',
  },
  board: {
    //'ui:widget': 'HiddenWidget',
  },
  effortEstimate: {
    //'ui:widget': 'HiddenWidget',
  },
  currencyEstimate: {
    //'ui:widget': 'HiddenWidget',
  },
  currency: {
    //'ui:widget': 'HiddenWidget',
  },
  taskCost: {
    //'ui:widget': 'HiddenWidget',
  },  
};

export default DefaultUiSchema;
