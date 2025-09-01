const uiSchema: any = {
  'ui:options': {
    showSubmit: false
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      metrics: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    },
    {
      recentActivity: { xs: 12, sm: 12, md: 6, lg: 6, xl: 6 },
      alerts: { xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }
    },
    {
      topWorkflows: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  metrics: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        lifecycle: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
        scheduler: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
        performance: { xs: 12, sm: 12, md: 4, lg: 4, xl: 4 }
      }
    ],
    lifecycle: {
      'ui:widget': 'MetricsCard',
      'ui:options': {
        title: 'Workflow Lifecycle',
        icon: 'timeline',
        metrics: [
          { 
            field: 'activeInstances', 
            label: 'Active', 
            color: 'primary',
            format: 'number'
          },
          { 
            field: 'completedInstances', 
            label: 'Completed Today', 
            color: 'success',
            format: 'number'
          },
          { 
            field: 'failedInstances', 
            label: 'Failed Today', 
            color: 'error',
            format: 'number'
          },
          { 
            field: 'averageExecutionTime', 
            label: 'Avg Time', 
            color: 'info',
            format: 'duration'
          }
        ],
        elevation: 2
      }
    },
    scheduler: {
      'ui:widget': 'MetricsCard',
      'ui:options': {
        title: 'Scheduler Status',
        icon: 'schedule',
        metrics: [
          { 
            field: 'activeSchedules', 
            label: 'Active Schedules', 
            color: 'primary',
            format: 'number'
          },
          { 
            field: 'executionsToday', 
            label: 'Today\'s Runs', 
            color: 'success',
            format: 'number'
          },
          { 
            field: 'missedExecutions', 
            label: 'Missed', 
            color: 'warning',
            format: 'number'
          },
          { 
            field: 'nextExecution', 
            label: 'Next Run', 
            color: 'info',
            format: 'fromNow'
          }
        ],
        elevation: 2
      }
    },
    performance: {
      'ui:widget': 'MetricsCard',
      'ui:options': {
        title: 'Performance',
        icon: 'speed',
        metrics: [
          { 
            field: 'throughput', 
            label: 'Throughput/Hr', 
            color: 'primary',
            format: 'number',
            suffix: '/hr'
          },
          { 
            field: 'errorRate', 
            label: 'Error Rate', 
            color: 'error',
            format: 'percentage'
          },
          { 
            field: 'queueDepth', 
            label: 'Queue Depth', 
            color: 'warning',
            format: 'number'
          },
          { 
            field: 'resourceUtilization', 
            label: 'Resources', 
            color: 'info',
            format: 'percentage'
          }
        ],
        elevation: 2
      }
    }
  },
  recentActivity: {
    'ui:widget': 'ActivityFeed',
    'ui:options': {
      title: 'Recent Activity',
      icon: 'history',
      maxItems: 10,
      showTimestamp: true,
      itemTemplate: {
        primary: '${event}',
        secondary: '${workflowName} - ${status}',
        avatar: '${status}',
        timestamp: '${timestamp}'
      },
      elevation: 1,
      refreshInterval: 15000
    }
  },
  alerts: {
    'ui:widget': 'AlertsList',
    'ui:options': {
      title: 'Active Alerts',
      icon: 'warning',
      maxItems: 10,
      showSeverity: true,
      actions: [
        {
          label: 'Acknowledge',
          icon: 'check',
          action: 'acknowledgeAlert'
        },
        {
          label: 'Dismiss',
          icon: 'close',
          action: 'dismissAlert'
        }
      ],
      elevation: 1
    }
  },
  topWorkflows: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      title: 'Top Performing Workflows',
      columns: [
        { 
          title: 'Workflow', 
          field: 'workflowName',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'subtitle2',
                format: '${rowData.namespace}.${rowData.workflowName}'
              }
            }
          }
        },
        { 
          title: 'Executions',
          field: 'executions',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.executions.toLocaleString()}'
              }
            }
          }
        },
        { 
          title: 'Success Rate', 
          field: 'successRate',
          component: 'workflow.SuccessRateBadge@1.0.0',
          propsMap: {
            'rowData.successRate': 'value'
          }
        },
        { 
          title: 'Avg Duration', 
          field: 'avgDuration',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${reactory.utils.moment.duration(rowData.avgDuration).humanize()}'
              }
            }
          }
        }
      ],
      remoteData: true,
      query: 'workflowMetrics',
      resultMap: {
        'lifecycle': 'data.metrics.lifecycle',
        'scheduler': 'data.metrics.scheduler',
        'performance': 'data.metrics.performance',
        'recentActivity': 'data.recentActivity',
        'alerts': 'data.alerts',
        'topWorkflows': 'data.topWorkflows'
      },
      pageSize: 5,
      showPaging: false,
      elevation: 1
    }
  }
};

export default uiSchema;
