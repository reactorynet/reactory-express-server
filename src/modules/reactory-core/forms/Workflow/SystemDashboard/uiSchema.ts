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
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'System Status',
        description: '${formData?.status?.status || "Unknown"}',
        displayValue: true,
        mapping: {
          'formData.status': 'value',
          'formData.timestamp': 'description'
        },
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }
        },
        actions: [
          {
            label: 'View Details',
            icon: 'info',
            onClick: 'event:system:viewDetails'
          }
        ]
      }
    },
    lifecycle: {
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'Workflow Lifecycle',
        description: 'Instance status overview',
        displayValue: false,
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }
        },
        actions: [
          {
            label: 'Active: ${formData?.activeInstances || 0}',
            icon: 'play_circle',
            onClick: 'event:lifecycle:viewActive'
          },
          {
            label: 'Completed: ${formData?.completedInstances || 0}',
            icon: 'check_circle',
            onClick: 'event:lifecycle:viewCompleted'
          },
          {
            label: 'Failed: ${formData?.failedInstances || 0}',
            icon: 'error',
            onClick: 'event:lifecycle:viewFailed'
          },
          {
            label: 'Paused: ${formData?.pausedInstances || 0}',
            icon: 'pause_circle',
            onClick: 'event:lifecycle:viewPaused'
          }
        ]
      }
    },
    configuration: {
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'Configuration Status',
        description: 'System configuration overview',
        displayValue: false,
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }
        },
        actions: [
          {
            label: 'Total: ${formData?.totalConfigurations || 0}',
            icon: 'settings',
            onClick: 'event:config:viewAll'
          },
          {
            label: 'Active: ${formData?.activeConfigurations || 0}',
            icon: 'check_circle',
            onClick: 'event:config:viewActive'
          },
          {
            label: 'Errors: ${formData?.validationErrors || 0}',
            icon: 'error',
            onClick: 'event:config:viewErrors',
            visible: '${formData?.validationErrors > 0}'
          }
        ]
      }
    },
    security: {
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'Security Overview',
        description: 'Authentication and authorization metrics',
        displayValue: false,
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }
        },
        actions: [
          {
            label: 'Auth Requests: ${formData?.authenticatedRequests || 0}',
            icon: 'security',
            onClick: 'event:security:viewAuth'
          },
          {
            label: 'Unauthorized: ${formData?.unauthorizedAttempts || 0}',
            icon: 'block',
            onClick: 'event:security:viewUnauthorized',
            visible: '${formData?.unauthorizedAttempts > 0}'
          },
          {
            label: 'Permission Denials: ${formData?.permissionDenials || 0}',
            icon: 'warning',
            onClick: 'event:security:viewDenials',
            visible: '${formData?.permissionDenials > 0}'
          }
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
    'ui:widget': 'CardWidget',
    'ui:options': {
      title: 'System Controls',
      description: 'Manage workflow system operations',
      displayValue: false,
      headerOptions: {
        sx: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }
      },
      actions: [
        {
          label: 'Pause System',
          icon: 'pause',
          onClick: 'mutation:pauseWorkflowSystem',
          disabled: false
        },
        {
          label: 'Resume System',
          icon: 'play_arrow',
          onClick: 'mutation:resumeWorkflowSystem',
          disabled: false
        },
        {
          label: 'Reload Config',
          icon: 'refresh',
          onClick: 'mutation:reloadWorkflowConfigurations',
          disabled: false
        }
      ]
    }
  }
};

export default uiSchema;
