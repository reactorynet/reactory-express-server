export const TowerStoneTaskDetailUISchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      project: { md: 6 },
      board: { md: 6 },
    },
    {
      title: { md: 6 },
      taskType: { md: 6 },
    },
    {
      startDate: { md: 6 },
      endDate: { md: 6 },
    },
    {
      user: { md: 6 },
      priority: { md: 6 },
    },

  ],
  id: {
    'ui:widget': 'HiddenWidget',
  },
  project: {
    'ui:widget': 'HiddenWidget',
    'ui:emptyValue': 'user-linked',
  },
  percentComplete: {
    /*
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
    */
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
    'ui:options': {
      froalaOptions: {
        charCounterMax: 500,
        toolbarInline: false,
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
    // 'ui:widget': 'ChipArrayWidget',
    'ui:options': {
      // container: 'core.BasicContainer',
      // containerProps: {
      //  title: 'Task Labels',
      //  style: {
      //    maxWidth: '100%',
      //    justifyContent: 'flex-end',
      //  },
      // },
    },
  },
  assignedTo: {
    // 'ui:widget': 'UserSearch',
  },
};

export default {
  TowerStoneTaskDetailUISchema,
};

