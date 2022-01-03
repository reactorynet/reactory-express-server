
const uiSchema: any = {
  'ui:options': {
    showSubmit: false
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { 
      message: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
      tickets: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
  message: { 
    'ui:widget': 'StaticContent',
    'ui:title': '',
    'ui:options': {
      showTitle: false,
      slug: "support-tickets-welcome-header"
    }
  },
  tickets: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [        
        { 
          title: 'Status', 
          field: 'status',
          component: 'core.SupportTicketStatusComponent@1.0.0',
          propsMap: {
            'rowData.status': 'status'
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
      optios: {},
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'tickets': 'data'
      },
      variables: {
        'query.search': 'filter.searchString',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize',
      }
    }
  }
};

export default uiSchema;