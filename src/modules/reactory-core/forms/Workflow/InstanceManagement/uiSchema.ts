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
      instances: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],  
};

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: true,
  search: true,
  deleteButtonProps: {
    icon: 'delete',
    tooltip: 'Delete completed/failed instances',
    onClick: 'core.WorkflowInstanceManager@1.0.0/deleteInstance'
  },
  columns: [
    // Instance ID - Copyable
    {
      title: 'Instance ID',
      field: 'id',
      width: 180,
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
    
    // Status Badge with Color Coding
    {
      title: 'Status',
      field: 'status',
      width: 140,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.status': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            colorMap: {
              'PENDING': '#9e9e9e',
              'RUNNING': '#2196f3',
              'COMPLETED': '#4caf50',
              'FAILED': '#f44336',
              'PAUSED': '#ff9800',
              'CANCELLED': '#757575'
            },
            iconMap: {
              'PENDING': 'schedule',
              'RUNNING': 'play_circle',
              'COMPLETED': 'check_circle',
              'FAILED': 'error',
              'PAUSED': 'pause_circle',
              'CANCELLED': 'cancel'
            },
            labelFormat: '${value}'
          }
        }
      },
      defaultSort: 'desc'
    },
    
    // Workflow Name - Full ID
    {
      title: 'Workflow',
      field: 'workflowName',
      width: 280,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'subtitle2',
            format: '${rowData.namespace}.${rowData.workflowName}@${rowData.version}',
            style: {
              fontWeight: 600
            }
          }
        }
      }
    },
    
    // Progress Bar
    {
      title: 'Progress',
      field: 'progress',
      width: 150,
      component: 'ProgressBarWidget',
      propsMap: {
        'rowData.progress': 'value',
        'rowData.status': 'status'
      },
      props: {
        uiSchema: {
          'ui:options': {
            showPercentage: true,
            variant: 'determinate',
            size: 'medium',
            colorByStatus: {
              'RUNNING': 'primary',
              'PAUSED': 'warning',
              'COMPLETED': 'success',
              'FAILED': 'error',
              'CANCELLED': 'default'
            }
          }
        }
      }
    },
    
    // Start Time - Relative Time
    {
      title: 'Started',
      field: 'startTime',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.startTime': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            autoRefresh: true,
            refreshInterval: 60000
          }
        }
      },
      type: 'datetime',
      defaultSort: 'desc'
    },
    
    // End Time
    {
      title: 'Ended',
      field: 'endTime',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.endTime': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            emptyText: 'Running...'
          }
        }
      },
      type: 'datetime'
    },
    
    // Duration
    {
      title: 'Duration',
      field: 'duration',
      width: 120,
      component: 'DurationWidget',
      propsMap: {
        'rowData.duration': 'milliseconds'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'humanized',
            emptyText: 'N/A'
          }
        }
      },
      type: 'numeric'
    },
    
    // Created By User
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
    
    // Tags as Chips
    {
      title: 'Tags',
      field: 'tags',
      width: 180,
      component: 'ChipArrayWidget',
      propsMap: {
        'rowData.tags': 'values'
      },
      props: {
        uiSchema: {
          'ui:options': {
            size: 'small',
            variant: 'outlined',
            color: 'default',
            maxDisplay: 2
          }
        }
      }
    },
  ],
  remoteData: true,
  query: 'workflowInstances',
  
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
      field: 'status',
      condition: 'FAILED',
      style: {
        backgroundColor: '#ffebee',
        borderLeft: '4px solid #f44336'
      }
    },
    {
      field: 'status',
      condition: 'RUNNING',
      style: {
        backgroundColor: '#e3f2fd',
        borderLeft: '4px solid #2196f3'
      }
    },
    {
      field: 'status',
      condition: 'PAUSED',
      style: {
        backgroundColor: '#fff8e1',
        borderLeft: '4px solid #ff9800'
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
    { name: "core.WorkflowInstanceUpdatedEvent" },
    { name: "core.WorkflowInstanceCompletedEvent" },
    { name: "core.WorkflowInstanceFailedEvent" }
  ],
  
  actions: [
    {
      key: 'view',
      icon: 'visibility',
      title: 'View Details',
      tooltip: 'View instance details and execution logs',
      event: {
        name: 'viewInstanceDetails',
        via: 'component',
        component: 'core.WorkflowInstanceDetailsPanel@1.0.0',
        paramsMap: {
          'rowData': 'instance'
        }
      }
    },
    {
      key: 'pause',
      icon: 'pause',
      title: 'Pause',
      tooltip: 'Pause workflow execution',
      disabled: '${rowData.status !== "RUNNING"}',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'PAUSE',
        cancelTitle: 'CANCEL',
        content: 'Are you sure you want to pause this workflow instance?',
        title: 'Pause Workflow Instance?',
      },
      event: {
        name: 'pauseInstance',
        via: 'component',
        component: 'core.WorkflowInstanceManager@1.0.0',
        paramsMap: {
          'rowData.id': 'instanceId'
        }
      }
    },
    {
      key: 'resume',
      icon: 'play_arrow',
      title: 'Resume',
      tooltip: 'Resume workflow execution',
      disabled: '${rowData.status !== "PAUSED"}',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'RESUME',
        cancelTitle: 'CANCEL',
        content: 'Are you sure you want to resume this workflow instance?',
        title: 'Resume Workflow Instance?',
      },
      event: {
        name: 'resumeInstance',
        via: 'component',
        component: 'core.WorkflowInstanceManager@1.0.0',
        paramsMap: {
          'rowData.id': 'instanceId'
        }
      }
    },
    {
      key: 'cancel',
      icon: 'cancel',
      title: 'Cancel',
      tooltip: 'Cancel workflow execution',
      disabled: '${!["RUNNING", "PAUSED", "PENDING"].includes(rowData.status)}',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'CANCEL WORKFLOW',
        cancelTitle: 'KEEP RUNNING',
        content: 'Are you sure you want to cancel this workflow instance? This action cannot be undone.',
        title: 'Cancel Workflow Instance?',
      },
      event: {
        name: 'cancelInstance',
        via: 'component',
        component: 'core.WorkflowInstanceManager@1.0.0',
        paramsMap: {
          'rowData.id': 'instanceId'
        }
      }
    },
    {
      key: 'delete',
      icon: 'delete',
      title: 'Delete',
      tooltip: 'Delete instance record',
      disabled: '${!["COMPLETED", "FAILED", "CANCELLED"].includes(rowData.status)}',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'DELETE',
        cancelTitle: 'CANCEL',
        content: 'Are you sure you want to delete this workflow instance record? This action cannot be undone.',
        title: 'Delete Instance Record?',
      },
      event: {
        name: 'deleteInstance',
        via: 'component',
        component: 'core.WorkflowInstanceManager@1.0.0',
        paramsMap: {
          'rowData.id': 'instanceId'
        }
      }
    }
  ],
  
  componentMap: {
    DetailsPanel: "core.WorkflowInstanceDetailsPanel@1.0.0"
  },
  
  detailPanelProps: {
    useCase: 'grid'
  },
  
  detailPanelPropsMap: {
    'props.rowData': 'instance',    
  },
  
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'instances': 'data'
  },
  
  variables: {
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
    'filter.workflowName': 'filter.workflowName',
    'filter.namespace': 'filter.namespace',
    'filter.status': 'filter.status'
  }
}

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  instances: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
}

// List View Alternative
const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {      
  primaryText: '${item.workflowName} (${item.status})',
  secondaryText: 'Started: ${reactory.utils.moment(item.startTime).fromNow()}',
  showAvatar: false,
  showTitle: true,
  showLabel: false,    
  allowAdd: false,
  secondaryAction: {      
    action: 'mount',
    componentFqn: 'core.WorkflowInstanceStatusComponent@1.0.0',
    propsMap: {
      'item.status': 'status',
      'item': 'instance'
    },
    props: {
      useCase: 'list'
    },
  },
  remoteData: true,
  query: 'workflowInstances',
  options: {},
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'instances': 'data'
  },
  variables: {
    'search': 'filter.searchString',
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize',
  },
  title: 'Workflow Instances',
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
  instances: {
    'ui:widget': 'MaterialListWidget',
    'ui:title': null,
    'ui:options': ListUIOptions as Reactory.Schema.IUISchemaOptions,
  },
}

export default GridUISchema;
