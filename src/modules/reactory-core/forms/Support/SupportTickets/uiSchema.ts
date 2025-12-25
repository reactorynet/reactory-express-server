import Reactory from "@reactory/reactory-core";

const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {      
    primaryText: '${itemIndex + 1}. ${item.reference}',
    secondaryText: '${item.request}',
    showAvatar: false,
    showTitle: true,
    showLabel: false,    
    allowAdd: false,
    secondaryAction: {      
      action: 'mount',
      componentFqn: 'core.SupportTicketStatusComponent@1.0.0',
      propsMap: {
        'item.status': 'status',
        'item': 'ticket'
      },
      props: {
        useCase: 'list'
      },
    },
    remoteData: true,
    query: 'openTickets',
    options: {},
    resultMap: {
      'paging.page': 'paging.page',
      'paging.total': 'paging.totalCount',
      'paging.pageSize': 'paing.pageSize',
      'tickets': 'data'
    },
    variables: {
      'search': 'filter.searchString',
      'paging.page': 'paging.page',
      'paging.pageSize': 'paging.pageSize',
    },
    title: 'Support Tickets',
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

const ticketsListUISchema: Reactory.Schema.IUISchema = {
  'ui:widget': 'MaterialListWidget',
  'ui:title': null,
  'ui:options': ListUIOptions as Reactory.Schema.IUISchemaOptions,
};


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
      //buttonTitle: 'VIEW STYLE',
      //buttonVariant: 'icon-button',
      variant: 'icon-button',
    }
  },
  'ui:title': null,  
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      tickets: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],  
};

export const ListUiSchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  tickets: ticketsListUISchema,
}

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: true,
  allowDelete: true,
  search: true,
  addButtonProps: {
    icon: 'add',
    tooltip: 'reactory:support-ticket.ticket-grid.add-ticket-button.tooltip',
    onClick: 'core.SupportTicketWorkflow@1.0.0/addNew'
  },
  deleteButtonProps: {
    icon: 'delete',
    tooltip: 'reactory:support-ticket.ticket-grid.delete-ticket-button.tooltip',
    onClick: 'core.SupportTicketWorkflow@1.0.0/deleteTicket'
  },
  columns: [
    // Reference Number - Copyable
    {
      title: 'Ref',
      field: 'reference',
      width: 120,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.reference}',
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
    
    // Status Badge with Color Coding
    {
      title: 'Status',
      field: 'status',
      width: 150,
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
              'new': '#9c27b0',
              'open': '#2196f3',
              'in-progress': '#ff9800',
              'pending': '#fbc02d',
              'resolved': '#4caf50',
              'closed': '#757575',
              'on-hold': '#fbc02d'
            },
            iconMap: {
              'new': 'fiber_new',
              'open': 'folder_open',
              'in-progress': 'pending',
              'pending': 'schedule',
              'resolved': 'check_circle',
              'closed': 'check_circle_outline',
              'on-hold': 'pause_circle'
            },
            labelFormat: '${value.toUpperCase()}'
          }
        }
      }
    },
    
    // Priority Badge with Color Coding and Icons
    {
      title: 'Priority',
      field: 'priority',
      width: 130,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.priority': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            colorMap: {
              'critical': '#d32f2f',
              'high': '#f57c00',
              'medium': '#1976d2',
              'low': '#757575'
            },
            iconMap: {
              'critical': 'local_fire_department',
              'high': 'arrow_upward',
              'medium': 'remove',
              'low': 'arrow_downward'
            },
            labelFormat: '${value.toUpperCase()}'
          }
        }
      },
      defaultSort: 'desc'
    },
    
    // Request Title - Main Subject
    {
      title: 'Request',
      field: 'request',
      width: 300,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.request}',
            style: {
              fontWeight: 500
            }
          }
        }
      },
      cellStyle: {
        fontWeight: 500
      }
    },
    
    // Request Type
    {
      title: 'Type',
      field: 'requestType',
      width: 130,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.requestType': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'outlined',
            size: 'small',
            colorMap: {
              'bug': '#f44336',
              'feature': '#9c27b0',
              'question': '#2196f3',
              'support': '#4caf50',
              'other': '#757575'
            },
            iconMap: {
              'bug': 'bug_report',
              'feature': 'lightbulb',
              'question': 'help',
              'support': 'support_agent',
              'other': 'more_horiz'
            }
          }
        }
      }
    },
    
    // Logged By User with Avatar
    {
      title: 'Logged By',
      field: 'createdBy',
      width: 180,
      component: 'UserAvatarWidget',
      propsMap: {
        'rowData.createdBy': 'user'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'chip',
            size: 'small',
            showEmail: true
          }
        }
      }
    },
    
    // Assigned To User with Avatar
    {
      title: 'Assigned To',
      field: 'assignedTo',
      width: 180,
      component: 'UserAvatarWidget',
      propsMap: {
        'rowData.assignedTo': 'user'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'chip',
            size: 'small',
            showEmail: true,
            unassignedText: 'Unassigned',
            unassignedIcon: 'person_add_disabled'
          }
        }
      }
    },
    
    // Created Date - Relative Time
    {
      title: 'Created',
      field: 'createdDate',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.createdDate': 'date'
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
    
    // Last Updated Date - Relative Time
    {
      title: 'Updated',
      field: 'updatedDate',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.updatedDate': 'date'
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
    
    // Comments Count Badge
    {
      title: 'Comments',
      field: 'comments',
      width: 100,
      align: 'center',
      component: 'CountBadgeWidget',
      propsMap: {
        'rowData.comments': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            icon: 'comment',
            showZero: true,
            color: 'primary',
            singularLabel: 'comment',
            pluralLabel: 'comments'
          }
        }
      }
    },
    
    // Attachments Count Badge
    {
      title: 'Files',
      field: 'documents',
      width: 100,
      align: 'center',
      component: 'CountBadgeWidget',
      propsMap: {
        'rowData.documents': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            icon: 'attach_file',
            showZero: true,
            color: 'default',
            singularLabel: 'file',
            pluralLabel: 'files'
          }
        }
      }
    },
  ],
  remoteData: true,
  query: 'openTickets',
  // Base row styling (static objects only - no functions)
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
      field: 'priority',
      condition: 'critical',
      style: {
        backgroundColor: '#ffebee',
        borderLeft: '4px solid #d32f2f'
      }
    },
    {
      field: 'priority',
      condition: 'high',
      style: {
        backgroundColor: '#fff8e1',
        borderLeft: '4px solid #f57c00'
      }
    },
    {
      field: 'isOverdue',
      condition: 'true',
      style: {
        backgroundColor: '#fce4ec',
        borderLeft: '4px solid #e91e63'
      }
    }
  ],
  
  options: {
    selection: true,
    search: true,
    searchFieldAlignment: 'left',
    grouping: true,
    filtering: false, // Can enable later with advanced filters
    exportButton: true,
    exportAllData: true,
    columnsButton: true, // Show/hide columns
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
  refreshEvents: [{ name: "core.SupportTicketDeletedEvent" }],
  actions: [
    {
      key: 'delete',
      icon: 'delete',
      title: 'Delete',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'DELETE ${rowData.reference}',
        cancelTitle: 'CANCEL',
        content: '${reactory.i18n.t("forms:confirm.delete.supportticket")} ${rowData.reference}',
        title: 'Delete ${rowData.reference}?',
      },
      event: {
        name: 'deleteTicket',
        via: 'component',
        component: 'core.SupportTicketWorkflow@1.0.0',
        paramsMap: {
          'rowData': 'tickets[0]'
        }
      }
    },
    {
      key: 'deleteSelected',
      icon: 'delete',
      title: 'Delete ${selected.length} tickets',
      isFreeAction: true,
      confirmation: {
        key: 'confirm',
        acceptTitle: 'DELETE ${selected.length} TICKETS',
        cancelTitle: 'CANCEL',
        content: 'forms:confirm.deleteticketsaction.dialog.content',
        title: 'forms:confirm.deleteticketsaction.dialog.title',
      },
      event: {
        name: 'deleteTicket',
        via: 'component',
        component: 'core.SupportTicketWorkflow@1.0.0',
        paramsMap: {
          'selected': 'tickets'
        }
      }
    }
  ],
  componentMap: {
    DetailsPanel: "core.SupportTicketInfoPanel@1.0.0"
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'ticket',    
  },
  resultMap: {
    'paging.page': 'paging.page',
    'paging.total': 'paging.total',
    'paging.pageSize': 'paing.pageSize',
    'tickets': 'data'
  },
  variables: {
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
  }
}

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  tickets: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
};