import Reactory from "@reactory/reactory-core";

const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: "div",
    showSubmit: false,
    showRefresh: true,
    toolbarPosition: "top",
    toolbarStyle: {
      display: 'flex',
      justifyContent: 'flex-end'
    },
    showSchemaSelectorInToolbar: true,
    schemaSelector: {
      variant: 'icon-button',
    }
  },
  'ui:title': null,  
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      schedules: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],  
};

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: true,
  allowDelete: true,
  search: true,
  addButtonProps: {
    icon: 'add',
    tooltip: 'Create new workflow schedule',
    onClick: 'core.WorkflowScheduleForm@1.0.0/create'
  },
  deleteButtonProps: {
    icon: 'delete',
    tooltip: 'Delete selected schedules',
    onClick: 'core.WorkflowScheduleManager@1.0.0/deleteSchedules'
  },
  columns: [
    // Schedule ID - Copyable
    {
      title: 'Schedule ID',
      field: 'id',
      width: 150,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.id.substring(0, 8)}...',
            copyToClipboard: true,
            copyValue: '${rowData.id}',
            style: {
              fontFamily: 'monospace',
              fontWeight: 600,
              color: '#1976d2'
            }
          }
        }
      },
      cellStyle: {
        fontFamily: 'monospace'
      }
    },
    
    // Enabled/Disabled Status Badge
    {
      title: 'Status',
      field: 'enabled',
      width: 120,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.enabled': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            valueMap: {
              'true': 'ENABLED',
              'false': 'DISABLED'
            },
            colorMap: {
              'true': '#4caf50',
              'false': '#757575'
            },
            iconMap: {
              'true': 'check_circle',
              'false': 'cancel'
            }
          }
        }
      },
      defaultSort: 'desc'
    },
    
    // Workflow Full ID
    {
      title: 'Workflow',
      field: 'workflowName',
      width: 280,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'subtitle2',
            format: '${rowData.namespace}.${rowData.workflowName}',
            style: {
              fontWeight: 600
            }
          }
        }
      }
    },
    
    // Cron Expression with visual indicator
    {
      title: 'Schedule',
      field: 'cronExpression',
      width: 200,
      component: 'CronExpressionWidget',
      propsMap: {
        'rowData.cronExpression': 'expression',
        'rowData.timezone': 'timezone'
      },
      props: {
        uiSchema: {
          'ui:options': {
            showDescription: true,
            showNextRun: false,
            style: {
              fontFamily: 'monospace',
              backgroundColor: '#f5f5f5',
              padding: '4px 8px',
              borderRadius: '4px'
            }
          }
        }
      }
    },
    
    // Timezone
    {
      title: 'Timezone',
      field: 'timezone',
      width: 120,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.timezone || "UTC"}',
            icon: 'schedule'
          }
        }
      }
    },
    
    // Execution Progress
    {
      title: 'Executions',
      field: 'executionCount',
      width: 150,
      component: 'ExecutionProgressWidget',
      propsMap: {
        'rowData.executionCount': 'current',
        'rowData.maxExecutions': 'max'
      },
      props: {
        uiSchema: {
          'ui:options': {
            showProgressBar: true,
            format: '${current}/${max || "∞"}',
            colorThresholds: {
              warning: 75,
              danger: 90
            }
          }
        }
      },
      type: 'numeric'
    },
    
    // Last Execution - Relative Time
    {
      title: 'Last Run',
      field: 'lastExecution',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.lastExecution': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            emptyText: 'Never'
          }
        }
      },
      type: 'datetime'
    },
    
    // Next Execution - Countdown/Relative Time
    {
      title: 'Next Run',
      field: 'nextExecution',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.nextExecution': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            emptyText: 'N/A',
            futurePrefix: 'in ',
            autoRefresh: true,
            refreshInterval: 60000
          }
        }
      },
      type: 'datetime',
      defaultSort: 'asc'
    },
    
    // Start Date
    {
      title: 'Start Date',
      field: 'startDate',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.startDate': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'date',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            emptyText: 'Immediate'
          }
        }
      },
      type: 'datetime'
    },
    
    // End Date
    {
      title: 'End Date',
      field: 'endDate',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.endDate': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'date',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            emptyText: 'No limit'
          }
        }
      },
      type: 'datetime'
    },
    
    // Created By
    {
      title: 'Created By',
      field: 'createdBy',
      width: 150,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.createdBy || "System"}',
            icon: 'person'
          }
        }
      }
    },
    
    // Created At - Relative Time
    {
      title: 'Created',
      field: 'createdAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.createdAt': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss'
          }
        }
      },
      type: 'datetime'
    },
  ],
  remoteData: true,
  query: 'workflowSchedules',
  
  // Base row styling
  rowStyle: {
    // Default row style
  },
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  },
  
  // Conditional row styling based on field values
  conditionalRowStyling: [
    {
      field: 'enabled',
      condition: 'false',
      style: {
        opacity: 0.6,
        backgroundColor: '#f5f5f5'
      }
    },
    {
      field: 'nextExecution',
      condition: (value: any) => {
        if (!value) return false;
        const nextRun = new Date(value);
        const now = new Date();
        const hoursUntil = (nextRun.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil < 1 && hoursUntil > 0;
      },
      style: {
        backgroundColor: '#fff8e1',
        borderLeft: '4px solid #ff9800'
      }
    },
    {
      field: 'maxExecutions',
      condition: (value: any, rowData: any) => {
        if (!value) return false;
        const progress = (rowData.executionCount / value) * 100;
        return progress >= 90;
      },
      style: {
        borderLeft: '4px solid #f57c00'
      }
    }
  ],
  
  options: {
    selection: true,
    search: true,
    searchFieldAlignment: 'left',
    grouping: true,
    filtering: true,
    exportButton: true,
    exportAllData: true,
    columnsButton: true,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    emptyRowsWhenPaging: false,
    debounceInterval: 500,
    thirdSortClick: false,
    padding: 'default',
    
    // Detail panel settings
    detailPanelType: 'single',
    showDetailPanelIcon: true,
    detailPanelColumnAlignment: 'left',
  },
  
  // Header styling
  headerStyle: {
    backgroundColor: '#f5f5f5',
    fontWeight: 600,
    fontSize: '0.875rem',
    borderBottom: '2px solid #e0e0e0'
  },
  
  refreshEvents: [
    { name: "core.WorkflowScheduleCreatedEvent" },
    { name: "core.WorkflowScheduleUpdatedEvent" },
    { name: "core.WorkflowScheduleDeletedEvent" }
  ],
  
  actions: [
    {
      key: 'edit',
      icon: 'edit',
      title: 'Edit Schedule',
      tooltip: 'Edit schedule configuration',
      event: {
        name: 'editSchedule',
        via: 'component',
        component: 'core.WorkflowScheduleForm@1.0.0',
        paramsMap: {
          'rowData': 'schedule'
        }
      }
    },
    {
      key: 'toggle',
      icon: '${rowData.enabled ? "pause" : "play_arrow"}',
      title: '${rowData.enabled ? "Disable" : "Enable"}',
      tooltip: '${rowData.enabled ? "Disable this schedule" : "Enable this schedule"}',
      confirmation: {
        key: 'confirm',
        acceptTitle: '${rowData.enabled ? "DISABLE" : "ENABLE"}',
        cancelTitle: 'CANCEL',
        content: '${rowData.enabled ? "Are you sure you want to disable" : "Are you sure you want to enable"} this schedule?',
        title: '${rowData.enabled ? "Disable" : "Enable"} Schedule?',
      },
      event: {
        name: 'toggleSchedule',
        via: 'component',
        component: 'core.WorkflowScheduleManager@1.0.0',
        paramsMap: {
          'rowData.id': 'scheduleId',
          'rowData.enabled': 'currentState'
        }
      }
    },
    {
      key: 'executeNow',
      icon: 'play_circle',
      title: 'Execute Now',
      tooltip: 'Execute workflow immediately',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'EXECUTE',
        cancelTitle: 'CANCEL',
        content: 'Execute ${rowData.namespace}.${rowData.workflowName} now?',
        title: 'Execute Workflow?',
      },
      event: {
        name: 'executeSchedule',
        via: 'component',
        component: 'core.WorkflowLauncher@1.0.0',
        paramsMap: {
          'rowData.workflowName': 'workflowName',
          'rowData.namespace': 'namespace',
          'rowData.input': 'input'
        }
      }
    },
    {
      key: 'viewInstances',
      icon: 'history',
      title: 'View Executions',
      tooltip: 'View execution history',
      event: {
        name: 'viewScheduleInstances',
        via: 'component',
        component: 'core.WorkflowInstanceManagement@1.0.0',
        paramsMap: {
          'rowData.namespace': 'filter.namespace',
          'rowData.workflowName': 'filter.workflowName',
          'rowData.id': 'filter.scheduleId'
        }
      }
    },
    {
      key: 'delete',
      icon: 'delete',
      title: 'Delete',
      tooltip: 'Delete this schedule',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'DELETE',
        cancelTitle: 'CANCEL',
        content: 'Are you sure you want to delete this schedule? This action cannot be undone.',
        title: 'Delete Schedule?',
      },
      event: {
        name: 'deleteSchedule',
        via: 'component',
        component: 'core.WorkflowScheduleManager@1.0.0',
        paramsMap: {
          'rowData.id': 'scheduleId'
        }
      }
    }
  ],
  
  componentMap: {
    DetailsPanel: "core.WorkflowScheduleDetailsPanel@1.0.0"
  },
  
  detailPanelProps: {
    useCase: 'grid'
  },
  
  detailPanelPropsMap: {
    'props.rowData': 'schedule',    
  },
  
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'schedules': 'data'
  },
  
  variables: {
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
  }
}

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  schedules: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
}

// List View Alternative
const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {      
  primaryText: '${item.namespace}.${item.workflowName}',
  secondaryText: 'Next run: ${reactory.utils.moment(item.nextExecution).fromNow()}',
  showAvatar: false,
  showTitle: true,
  showLabel: false,    
  allowAdd: true,
  secondaryAction: {      
    action: 'mount',
    componentFqn: 'core.WorkflowScheduleStatusComponent@1.0.0',
    propsMap: {
      'item.enabled': 'enabled',
      'item': 'schedule'
    },
    props: {
      useCase: 'list'
    },
  },
  remoteData: true,
  query: 'workflowSchedules',
  options: {},
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'schedules': 'data'
  },
  variables: {
    'search': 'filter.searchString',
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize',
  },
  title: 'Workflow Schedules',
  titleClass: 'title',
  jss: {
    root: {
      display: 'flex',
      flexDirection: 'column',
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    list: {
      minWidth: '70%',
      margin: 'auto',
      maxHeight: '80%',
      minHeight: '80%',
    }
  }
}

export const ListUiSchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  schedules: {
    'ui:widget': 'MaterialListWidget',
    'ui:title': null,
    'ui:options': ListUIOptions as Reactory.Schema.IUISchemaOptions,
  },
}
