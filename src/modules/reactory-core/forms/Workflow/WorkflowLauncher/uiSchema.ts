const uiSchema: any = {
  'ui:options': {
    submitButtonText: 'Launch Workflow'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      workflowId: { xs: 12, sm: 12, md: 8, lg: 8, xl: 8 },
    },
    {
      workflowDetails: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    },
    {
      executionInput: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    },
    {
      scheduleExecution: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
      scheduleDetails: { xs: 12, sm: 6, md: 8, lg: 8, xl: 8 }
    },
    {
      executionResult: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  workflowId: {
    'ui:widget': 'AsyncSelectWidget',
    'ui:options': {
      placeholder: 'Select a workflow to launch',
      searchable: true,
      clearable: true,
      query: 'workflows',
      valueField: 'id',
      labelField: 'displayName',
      descriptionField: 'description',
      resultMap: {
        'workflows': 'data.workflows'
      },      
      onSelectionChange: 'updateWorkflowDetails'
    }
  },
  workflowDetails: {
    'ui:widget': 'WorkflowDetailsCard',
    'ui:options': {
      showWhenEmpty: false,
      elevation: 1,
      fields: [
        { field: 'name', label: 'Name', variant: 'subtitle1' },
        { field: 'namespace', label: 'Namespace', variant: 'body2' },
        { field: 'version', label: 'Version', variant: 'caption' },
        { field: 'description', label: 'Description', variant: 'body2' },
        { field: 'tags', label: 'Tags', variant: 'caption', type: 'chips' }
      ]
    }
  },
  executionInput: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        input: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
      },
      {
        tags: { xs: 12, sm: 6, md: 6, lg: 6, xl: 6 },
        priority: { xs: 12, sm: 3, md: 3, lg: 3, xl: 3 },
        timeout: { xs: 12, sm: 3, md: 3, lg: 3, xl: 3 }
      }
    ],
    input: {
      'ui:widget': 'CodeEditorWidget',
      'ui:options': {
        language: 'json',
        height: 200,
        placeholder: '{\n  "key": "value",\n  "data": {\n    "example": true\n  }\n}',
        validateJson: true,
        formatOnBlur: true
      }
    },
    tags: {
      'ui:widget': 'ChipInputWidget',
      'ui:options': {
        placeholder: 'Add execution tags',
        allowDuplicates: false,
        maxTags: 10
      }
    },
    priority: {
      'ui:widget': 'SliderWidget',
      'ui:options': {
        min: 1,
        max: 10,
        step: 1,
        marks: true,
        valueLabelDisplay: 'auto'
      }
    },
    timeout: {
      'ui:widget': 'NumberWidget',
      'ui:options': {
        placeholder: '300',
        adornment: 'seconds'
      }
    }
  },
  scheduleExecution: {
    'ui:widget': 'SwitchWidget',
    'ui:options': {
      label: 'Schedule for later execution'
    }
  },
  scheduleDetails: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        scheduledTime: { xs: 12, sm: 8, md: 8, lg: 8, xl: 8 },
        timezone: { xs: 12, sm: 4, md: 4, lg: 4, xl: 4 }
      }
    ],
    'ui:options': {
      condition: 'formData.scheduleExecution === true'
    },
    scheduledTime: {
      'ui:widget': 'DateTimeWidget',
      'ui:options': {
        clearable: true,
        minDateTime: 'now',
        showTodayButton: true
      }
    },
    timezone: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        placeholder: 'Select timezone'
      }
    }
  },
  executionResult: {
    'ui:widget': 'ExecutionResultCard',
    'ui:options': {
      showWhenEmpty: false,
      elevation: 2,
      actions: [
        {
          label: 'View Instance',
          icon: 'visibility',
          action: 'viewWorkflowInstance',
          condition: 'data.instanceId'
        },
        {
          label: 'Monitor Progress',
          icon: 'timeline',
          action: 'monitorWorkflowProgress',
          condition: 'data.instanceId && data.status === "RUNNING"'
        }
      ]
    }
  }
};

export default uiSchema;
