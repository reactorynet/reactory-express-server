const uiSchema: any = {
  'ui:options': {
    showSubmit: false,
    showRefresh: false,
    showHelp: true
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'Paper',
    containerProps: {
      elevation: 0,
      square: true,
      variant: 'outlined',
    },
    sx: {
      border: "none",
      padding: 0,
      marginTop: 0,
      marginBottom: 0,
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
    },
  },
  'ui:grid-layout': [
    { 
      metrics: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
      sx: {
        backgroundColor: "#FFFFFF",
      }
    },
    {
      recentActivity: { xs: 12, sm: 12, md: 6, lg: 6, xl: 6 },
      alerts: { xs: 12, sm: 12, md: 6, lg: 6, xl: 6 },
      sx: {
        border: "none",
        padding: 8,
        marginTop: 8,
        marginBottom: 8,
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
      }
    },
    {
      topWorkflows: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  metrics: {
    'ui:field': 'GridLayout',
    'ui:grid-options': {
      container: 'Paper',
      containerProps: {
        elevation: 0,
        square: true,
        variant: 'outlined',
      },      
    },
    'ui:grid-layout': [
      {
        lifecycle: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
        scheduler: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
        performance: { xs: 12, sm: 12, md: 4, lg: 4, xl: 4 }
      }
    ],
    lifecycle: {
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'Active Workflows',
        description: '${formData?.metrics?.lifecycle?.activeInstances || 0} instances running',
        displayValue: true,
        value: '${formData?.metrics?.lifecycle?.activeInstances || 0}',
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }
        },
        actions: [
          {
            label: 'View Active',
            icon: 'play_circle',
            onClick: 'event:lifecycle:viewActive'
          },
          {
            label: 'View Completed (${formData?.metrics?.lifecycle?.completedInstances || 0})',
            icon: 'check_circle',
            onClick: 'event:lifecycle:viewCompleted'
          },
          {
            label: 'View Failed (${formData?.metrics?.lifecycle?.failedInstances || 0})',
            icon: 'error',
            onClick: 'event:lifecycle:viewFailed',
            visible: '${formData?.metrics?.lifecycle?.failedInstances > 0}'
          }
        ]
      }
    },
    scheduler: {
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'Active Schedules',
        description: '${formData?.metrics?.scheduler?.executionsToday || 0} runs today',
        displayValue: true,
        value: '${formData?.metrics?.scheduler?.activeSchedules || 0}',
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }
        },
        actions: [
          {
            label: 'View Schedules',
            icon: 'schedule',
            onClick: 'event:scheduler:viewActive'
          },
          {
            label: 'View Missed (${formData?.metrics?.scheduler?.missedExecutions || 0})',
            icon: 'warning',
            onClick: 'event:scheduler:viewMissed',
            visible: '${formData?.metrics?.scheduler?.missedExecutions > 0}'
          },
          {
            label: 'Next: ${formData?.metrics?.scheduler?.nextExecution ? reactory.utils.moment(formData.metrics.scheduler.nextExecution).fromNow() : "N/A"}',
            icon: 'schedule_send',
            onClick: 'event:scheduler:viewNext'
          }
        ]
      }
    },
    performance: {
      'ui:widget': 'CardWidget',
      'ui:options': {
        title: 'Throughput',
        description: '${formData?.metrics?.performance?.errorRate || 0}% error rate',
        displayValue: true,
        value: '${formData?.metrics?.performance?.throughput || 0}/hr',
        headerOptions: {
          sx: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }
        },
        actions: [
          {
            label: 'View Performance',
            icon: 'speed',
            onClick: 'event:performance:viewMetrics'
          },
          {
            label: 'View Errors (${formData?.metrics?.performance?.errorRate || 0}%)',
            icon: 'error_outline',
            onClick: 'event:performance:viewErrors',
            visible: '${formData?.metrics?.performance?.errorRate > 5}'
          },
          {
            label: 'View Queue (${formData?.metrics?.performance?.queueDepth || 0})',
            icon: 'queue',
            onClick: 'event:performance:viewQueue',
            visible: '${formData?.metrics?.performance?.queueDepth > 0}'
          },
          {
            label: 'Resources (${formData?.metrics?.performance?.resourceUtilization || 0}%)',
            icon: 'memory',
            onClick: 'event:performance:viewResources'
          }
        ]
      }
    }
  },
  recentActivity: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      title: 'Recent Activity',
      dense: true,
      maxItems: 8,
      itemTemplate: {
        primary: '${item.event}',
        secondary: '${item.workflowName} - ${item.status}',
        timestamp: '${item.timestamp}',
        avatar: {
          icon: '${item.status === "COMPLETED" ? "check_circle" : item.status === "FAILED" ? "error" : item.status === "RUNNING" ? "play_circle" : "schedule"}',
          color: '${item.status === "COMPLETED" ? "success" : item.status === "FAILED" ? "error" : item.status === "RUNNING" ? "primary" : "default"}'
        }
      },
      actions: [
        {
          label: 'View All Activity',
          icon: 'list',
          onClick: 'event:activity:viewAll'
        },
        {
          label: 'Export Log', 
          icon: 'download',
          onClick: 'event:activity:export'
        }
      ],
      itemActions: [
        {
          label: 'View Details',
          icon: 'visibility',
          onClick: 'event:activity:viewDetails'
        }
      ]
    }
  },
  alerts: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      title: 'Active Alerts',
      dense: true,
      maxItems: 8,
      itemTemplate: {
        primary: '${item.message}',
        secondary: '${item.source} • ${reactory.utils.moment(item.timestamp).fromNow()}',
        avatar: {
          icon: '${item.severity === "critical" ? "error" : item.severity === "warning" ? "warning" : "info"}',
          color: '${item.severity === "critical" ? "error" : item.severity === "warning" ? "warning" : "info"}'
        },
        badge: {
          show: '${!item.acknowledged}',
          color: '${item.severity === "critical" ? "error" : item.severity === "warning" ? "warning" : "info"}',
          variant: 'dot'
        }
      },
      groupBy: 'severity',
      sortBy: 'timestamp',
      sortOrder: 'desc',
      actions: [
        {
          label: 'Acknowledge All',
          icon: 'check_circle',
          onClick: 'mutation:acknowledgeAllAlerts',
          visible: '${formData?.alerts?.filter(a => !a.acknowledged).length > 0}'
        },
        {
          label: 'Clear Acknowledged',
          icon: 'clear_all',
          onClick: 'mutation:clearAcknowledgedAlerts',
          visible: '${formData?.alerts?.filter(a => a.acknowledged).length > 0}'
        }
      ],
      itemActions: [
        {
          label: 'Acknowledge',
          icon: 'check',
          onClick: 'mutation:acknowledgeAlert',
          visible: '${!item.acknowledged}'
        },
        {
          label: 'View Source',
          icon: 'open_in_new',
          onClick: 'event:alert:viewSource'
        }
      ]
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
