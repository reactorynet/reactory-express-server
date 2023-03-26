import Reactory from "@reactory/reactory-core";

const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions<Reactory.Models.IReactorySupportTicket> = {      
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
  'ui:options': ListUIOptions,
};


const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,
    container: "div",
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
  addButtonProps: {
    icon: 'add',
    tooltip: 'support:add_new_ticket',
    onClick: 'core.SupportTicketWorkflow@1.0.0/addNew'
  },
  deleteButtonProps: {
    icon: 'trash',
    tooltip: 'support:delete_ticket',
    onClick: 'core.SupportTicketWorkflow@1.0.0/deleteTicket'
  },
  columns: [
    {
      title: 'Status',
      field: 'status',
      component: 'core.SupportTicketStatusComponent@1.0.0',
      propsMap: {
        'rowData.status': 'status',
        'rowData': 'ticket'
      },
      props: {
        style: {
          alignItems: 'center'
        }
      }
    },
    {
      title: 'Logged By',
      field: 'createdBy',
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.createdBy ? rowData.createdBy.firstName : "NO"} ${rowData.createdBy ? rowData.createdBy.lastName : "USER"}'
          }
        },
      },
    },
    {
      title: 'Assigned To',
      field: 'assignedTo',
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.assignedTo ? rowData.assignedTo.firstName : "NOT"} ${rowData.assignedTo ? rowData.assignedTo.lastName : "ASSIGNED"}'
          }
        },
      },
    },
    {
      title: 'Logged @',
      field: 'createdDate',
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${reactory.utils.moment(rowData.createdDate).format("YYYY-MM-DD HH:mm")}'
          }
        },
      },
    },
  ],
  remoteData: true,
  query: 'openTickets',
  options: {
    selection: true,
    search: true,
    grouping: true,
    sortFields: [{ field: 'createdDate', direction: 'asc' }]
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