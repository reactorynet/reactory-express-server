const uiSchema: any = {
  'ui:options': {
    showSubmit: false
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      systemStatus: { xs: 12, sm: 12, md: 8, lg: 8, xl: 8 },
      quickActions: { xs: 12, sm: 12, md: 4, lg: 4, xl: 4 }
    },
    {
      recentErrors: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  systemStatus: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        system: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
      },
      {
        lifecycle: { xs: 12, sm: 6, md: 6, lg: 6, xl: 6 },
        configuration: { xs: 12, sm: 6, md: 6, lg: 6, xl: 6 }
      },
      {
        security: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
      }
    ],
    system: {
      'ui:widget': 'StatusCard',
      'ui:options': {
        title: 'System Status',
        statusField: 'status',
        timestampField: 'timestamp',
        variant: 'system'
      }
    },
    lifecycle: {
      'ui:widget': 'MetricsCard',
      'ui:options': {
        title: 'Workflow Lifecycle',
        metrics: [
          { field: 'activeInstances', label: 'Active', color: 'primary' },
          { field: 'completedInstances', label: 'Completed', color: 'success' },
          { field: 'failedInstances', label: 'Failed', color: 'error' },
          { field: 'pausedInstances', label: 'Paused', color: 'warning' }
        ],
        primaryMetric: 'totalInstances'
      }
    },
    configuration: {
      'ui:widget': 'MetricsCard',
      'ui:options': {
        title: 'Configuration Status',
        metrics: [
          { field: 'totalConfigurations', label: 'Total', color: 'info' },
          { field: 'activeConfigurations', label: 'Active', color: 'success' },
          { field: 'validationErrors', label: 'Errors', color: 'error' }
        ]
      }
    },
    security: {
      'ui:widget': 'MetricsCard',
      'ui:options': {
        title: 'Security Overview',
        metrics: [
          { field: 'authenticatedRequests', label: 'Auth Requests', color: 'success' },
          { field: 'unauthorizedAttempts', label: 'Unauthorized', color: 'error' },
          { field: 'permissionDenials', label: 'Permission Denials', color: 'warning' }
        ]
      }
    }
  },
  recentErrors: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      title: 'Recent Errors',
      columns: [
        { 
          title: 'Error Type', 
          field: 'errorType',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                color: 'error'
              }
            }
          }
        },
        { 
          title: 'Workflow',
          field: 'workflowName'
        },
        { 
          title: 'Count',
          field: 'count',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.count}'
              }
            }
          }
        },
        { 
          title: 'Last Occurrence', 
          field: 'lastOccurrence',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${reactory.utils.moment(rowData.lastOccurrence).fromNow()}'
              }
            }
          }
        },
        { 
          title: 'Message', 
          field: 'message'
        }
      ],
      remoteData: true,
      query: 'workflowSystemStatus',
      resultMap: {
        'systemStatus': 'data.systemStatus',
        'errors': 'data.recentErrors'
      },
      pageSize: 5,
      showPaging: false
    }
  },
  quickActions: {
    'ui:widget': 'ActionsCard',
    'ui:options': {
      title: 'System Controls',
      actions: [
        {
          label: 'Pause System',
          icon: 'pause',
          variant: 'outlined',
          color: 'warning',
          mutation: 'pauseWorkflowSystem'
        },
        {
          label: 'Resume System',
          icon: 'play_arrow',
          variant: 'outlined',
          color: 'success',
          mutation: 'resumeWorkflowSystem'
        },
        {
          label: 'Reload Config',
          icon: 'refresh',
          variant: 'outlined',
          color: 'primary',
          mutation: 'reloadWorkflowConfigurations'
        }
      ]
    }
  }
};

export default uiSchema;
