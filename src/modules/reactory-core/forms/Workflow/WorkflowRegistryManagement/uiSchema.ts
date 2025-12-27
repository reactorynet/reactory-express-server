import Reactory from "@reactory/reactory-core";

const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,    
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
      workflows: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],  
};

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: true,
  columns: [
    // Workflow Full ID - Copyable
    {
      title: 'Workflow ID',
      field: 'id',
      width: 280,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.nameSpace}.${rowData.name}@${rowData.version}',
            copyToClipboard: true,
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
    
    // Active Status Badge
    {
      title: 'Status',
      field: 'isActive',
      width: 120,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.isActive': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            valueMap: {
              'true': 'ACTIVE',
              'false': 'INACTIVE'
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
    
    // Workflow Name
    {
      title: 'Name',
      field: 'name',
      width: 200,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'subtitle1',
            format: '${rowData.name}',
            style: {
              fontWeight: 600
            }
          }
        }
      }
    },
    
    // Namespace Badge
    {
      title: 'Namespace',
      field: 'nameSpace',
      width: 150,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.nameSpace': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'outlined',
            size: 'small',
            colorMap: {
              'core': '#1976d2',
              'reactory': '#9c27b0',
              'custom': '#f57c00',
              'system': '#4caf50'
            },
            iconMap: {
              'core': 'settings',
              'reactory': 'bolt',
              'custom': 'extension',
              'system': 'security'
            }
          }
        }
      }
    },
    
    // Version
    {
      title: 'Version',
      field: 'version',
      width: 100,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.version}',
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
    
    // Description
    {
      title: 'Description',
      field: 'description',
      width: 300,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.description || "No description"}',
            style: {
              fontStyle: 'italic',
              color: '#666'
            }
          }
        }
      }
    },
    
    // Tags as Chips
    {
      title: 'Tags',
      field: 'tags',
      width: 200,
      component: 'ChipArrayWidget',
      propsMap: {
        'rowData.tags': 'values'
      },
      props: {
        uiSchema: {
          'ui:options': {
            size: 'small',
            variant: 'outlined',
            color: 'primary',
            maxDisplay: 3
          }
        }
      }
    },
    
    // Author
    {
      title: 'Author',
      field: 'author',
      width: 150,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.author || "Unknown"}',
            icon: 'person'
          }
        }
      }
    },
    
    // Dependencies Count Badge
    {
      title: 'Dependencies',
      field: 'dependencies',
      width: 120,
      align: 'center',
      component: 'CountBadgeWidget',
      propsMap: {
        'rowData.dependencies': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            icon: 'link',
            showZero: true,
            color: 'default',
            singularLabel: 'dependency',
            pluralLabel: 'dependencies'
          }
        }
      }
    },
    
    // Total Executions
    {
      title: 'Executions',
      field: 'statistics.totalExecutions',
      width: 120,
      align: 'right',
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.statistics?.totalExecutions || 0}',
            style: {
              fontWeight: 500
            }
          }
        }
      },
      type: 'numeric'
    },
    
    // Success Rate
    {
      title: 'Success Rate',
      field: 'statistics.successRate',
      width: 120,
      align: 'center',
      component: 'PercentageWidget',
      propsMap: {
        'rowData.statistics': 'statistics'
      },
      props: {
        uiSchema: {
          'ui:options': {
            calculateFrom: {
              numerator: 'successfulExecutions',
              denominator: 'totalExecutions'
            },
            showProgressBar: true,
            colorThresholds: {
              danger: 50,
              warning: 75,
              success: 90
            }
          }
        }
      }
    },
    
    // Created Date - Relative Time
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
      type: 'datetime',
      defaultSort: 'desc'
    },
    
    // Updated Date - Relative Time
    {
      title: 'Updated',
      field: 'updatedAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.updatedAt': 'date'
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
  query: 'registeredWorkflows',
  
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
      field: 'isActive',
      condition: 'false',
      style: {
        opacity: 0.6,
        backgroundColor: '#f5f5f5'
      }
    },
    {
      field: 'statistics.failedExecutions',
      condition: '(rowData) => rowData?.statistics?.failedExecutions > 0',
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
    { name: "core.WorkflowRegisteredEvent" },
    { name: "core.WorkflowUpdatedEvent" }
  ],
  
  actions: [
    {
      key: 'execute',
      icon: 'play_arrow',
      title: 'Execute Workflow',
      tooltip: 'Start a new instance of this workflow',
      event: {
        name: 'executeWorkflow',
        via: 'component',
        component: 'core.WorkflowLauncher@1.0.0',
        paramsMap: {
          'rowData': 'workflow'
        }
      }
    },
    {
      key: 'view',
      icon: 'visibility',
      title: 'View Details',
      tooltip: 'View workflow details and statistics',
      event: {
        name: 'viewWorkflowDetails',
        via: 'component',
        component: 'core.WorkflowDetailsPanel@1.0.0',
        paramsMap: {
          'rowData': 'workflow'
        }
      }
    },
    {
      key: 'instances',
      icon: 'history',
      title: 'View Instances',
      tooltip: 'View execution history',
      event: {
        name: 'viewWorkflowInstances',
        via: 'component',
        component: 'core.WorkflowInstanceManagement@1.0.0',
        paramsMap: {
          'rowData.nameSpace': 'filter.nameSpace',
          'rowData.name': 'filter.workflowName'
        }
      }
    },
    {
      key: 'toggle',
      icon: '${rowData.isActive ? "toggle_on" : "toggle_off"}',
      title: '${rowData.isActive ? "Deactivate" : "Activate"}',
      tooltip: '${rowData.isActive ? "Deactivate this workflow" : "Activate this workflow"}',
      confirmation: {
        key: 'confirm',
        acceptTitle: '${rowData.isActive ? "DEACTIVATE" : "ACTIVATE"}',
        cancelTitle: 'CANCEL',
        content: '${rowData.isActive ? "Are you sure you want to deactivate" : "Are you sure you want to activate"} ${rowData.nameSpace}.${rowData.name}?',
        title: '${rowData.isActive ? "Deactivate" : "Activate"} Workflow?',
      },
      event: {
        name: 'toggleWorkflow',
        via: 'component',
        component: 'core.WorkflowManager@1.0.0',
        paramsMap: {
          'rowData': 'workflow'
        }
      }
    }
  ],
  
  componentMap: {
    DetailsPanel: "core.WorkflowDetailsPanel@1.0.0"
  },
  
  detailPanelProps: {
    useCase: 'grid'
  },
  
  detailPanelPropsMap: {
    'props.rowData': 'workflow',    
  },
  
  resultMap: {
    'paging.page': 'pagination.page',
    'paging.total': 'pagination.total',
    'paging.pageSize': 'pagination.limit',
    'workflows': 'data'
  },
  
  variables: {
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
    'filter.nameSpace': 'filter.nameSpace',
    'filter.isActive': 'filter.isActive',
    'filter.tags': 'filter.tags'
  }
}

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  workflows: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
}

// List View Alternative
const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {      
  primaryText: '${item.nameSpace}.${item.name}@${item.version}',
  secondaryText: '${item.description || "No description available"}',
  showAvatar: false,
  showTitle: true,
  showLabel: false,    
  allowAdd: false,
  secondaryAction: {      
    action: 'mount',
    componentFqn: 'core.WorkflowStatusComponent@1.0.0',
    propsMap: {
      'item.isActive': 'isActive',
      'item': 'workflow'
    },
    props: {
      useCase: 'list'
    },
  },
  remoteData: true,
  query: 'registeredWorkflows',
  options: {},
  resultMap: {
    'paging.page': 'paging.page',
    'paging.total': 'paging.totalCount',
    'paging.pageSize': 'paging.pageSize',
    'workflows': 'data'
  },
  variables: {
    'search': 'filter.searchString',
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize',
  },
  title: 'Registered Workflows',
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
  workflows: {
    'ui:widget': 'MaterialListWidget',
    'ui:title': null,
    'ui:options': ListUIOptions as Reactory.Schema.IUISchemaOptions,
  },
}
