const uiSchema: any = {
  'ui:options': {
    showSubmit: false
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      filterMessage: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
      instances: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  filterMessage: { 
    'ui:widget': 'StaticContent',
    'ui:title': '',
    'ui:options': {
      showTitle: false,
      content: `
        <div style="padding: 16px; background-color: #f5f5f5; border-radius: 8px; margin-bottom: 16px;">
          <h6>Workflow Instance Management</h6>
          <p>Monitor and manage workflow instances. Use the controls to pause, resume, or cancel running workflows.</p>
        </div>
      `
    }
  },
  instances: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      title: 'Workflow Instances',
      columns: [        
        { 
          title: 'Status', 
          field: 'status',
          component: 'workflow.InstanceStatusBadge@1.0.0',
          propsMap: {
            'rowData': 'instance'
          },
          width: 120
        },
        { 
          title: 'Workflow',
          field: 'workflowName',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'subtitle2',
                format: '${rowData.namespace}.${rowData.workflowName}@${rowData.version}'
              }
            }
          },
          width: 250
        },
        { 
          title: 'Progress', 
          field: 'progress',
          component: 'workflow.ProgressBar@1.0.0',
          propsMap: {
            'rowData.progress': 'value',
            'rowData.status': 'status'
          },
          width: 120
        },
        { 
          title: 'Started', 
          field: 'startTime',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${reactory.utils.moment(rowData.startTime).format("MMM DD, HH:mm")}'
              }
            }
          },
          width: 120
        },
        { 
          title: 'Duration', 
          field: 'duration',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.duration ? reactory.utils.moment.duration(rowData.duration).humanize() : "N/A"}'
              }
            }
          },
          width: 100
        },
        { 
          title: 'Created By', 
          field: 'createdBy',
          width: 120
        },
        {
          title: 'Actions',
          field: 'actions',
          component: 'workflow.InstanceActions@1.0.0',
          propsMap: {
            'rowData': 'instance'
          },
          width: 200
        }
      ],
      remoteData: true,
      query: 'workflowInstances',
      resultMap: {
        'paging.page': 'pagination.page',
        'paging.total': 'pagination.total',
        'paging.pageSize': 'pagination.limit',
        'instances': 'instances'
      },
      variables: {
        'query.search': 'filter.searchString',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize',
        'filter.workflowName': 'filter.workflowName',
        'filter.namespace': 'filter.namespace',
        'filter.status': 'filter.status'
      },
      selection: true,
      multiSelect: true,
      showSearch: true,
      searchPlaceholder: 'Search workflow instances...',
      filters: [
        {
          field: 'workflowName',
          label: 'Workflow Name',
          type: 'text'
        },
        {
          field: 'namespace',
          label: 'Namespace',
          type: 'text'
        },
        {
          field: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'PENDING', label: 'Pending' },
            { value: 'RUNNING', label: 'Running' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'PAUSED', label: 'Paused' },
            { value: 'CANCELLED', label: 'Cancelled' }
          ]
        }
      ],
      bulkActions: [
        {
          label: 'Pause Selected',
          icon: 'pause',
          mutation: 'pauseWorkflowInstances',
          color: 'warning',
          confirmMessage: 'Are you sure you want to pause the selected instances?'
        },
        {
          label: 'Resume Selected',
          icon: 'play_arrow',
          mutation: 'resumeWorkflowInstances',
          color: 'success',
          confirmMessage: 'Are you sure you want to resume the selected instances?'
        },
        {
          label: 'Cancel Selected',
          icon: 'cancel',
          mutation: 'cancelWorkflowInstances',
          color: 'error',
          confirmMessage: 'Are you sure you want to cancel the selected instances? This action cannot be undone.'
        }
      ],
      rowActions: [
        {
          label: 'View Details',
          icon: 'visibility',
          action: 'viewInstanceDetails',
          color: 'primary'
        },
        {
          label: 'View Logs',
          icon: 'description',
          action: 'viewInstanceLogs',
          color: 'info'
        }
      ],
      defaultPageSize: 25,
      pageSizeOptions: [10, 25, 50, 100],
      exportable: true,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  }
};

export default uiSchema;
