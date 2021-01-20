

const uiSchema: any = {
  'ui:options': {
    showRefresh: false,
    submitIcon: 'check',
    showSubmit: false,
    toolbarPosition: 'none',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [    
    {
      clients: { lg: 12, md: 12, sm: 12, xs: 12 },
    },
    {
      selectedClient: { lg: 12, md: 12, sm: 12, xs: 12 }
    }
  ],

  repCode: {
    'ui:widget': 'RepCodeFilter',
    'ui:options': {
      props: {
        multiple: false,
      }
    }
  },
  clientSearchInput: {

  },
  clients: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {

      columns: [
        {
          title: 'Client Status', field: 'clientStatus',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'active',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Client Active'
                  },
                  {
                    key: 'unfinished',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Client Unfinished'
                  },
                  {
                    key: 'deactivated',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Client Deactivated'
                  }
                ]
              },
              style: {
                marginRight: '8px',
                marginTop: '8px',
              },
              propsMap: {
                'rowData.clientStatus': 'value',
              },
            }
          ],
          propsMap: {
            'rowData.clientStatus': 'selectedKey'
          },
          breakpoint: 'xs'

        },
        {
          title: 'Client Full Name',
          field: 'fullName',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMClientDetail@1.0.0',
            componentProps: {
              'rowData.id': 'formData.id',
              'rowData.salesTeam': 'formData.salesTeam',
            },
            childProps: {
              mode: 'view',
              uiSchemaKey: 'view'
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.fullName}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
            windowTitle: 'Client details: ${rowData.fullName}',
          },
          propsMap: {
            'rowData': 'rowData',
          },
        },
        {
          title: 'Customer',
          field: 'customer',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.customer && rowData.customer.tradingName ? rowData.customer.tradingName : "No Trading Name"}'
              }
            },
          },
          propsMap: {
            'rowData': 'value',
          },
          breakpoint: 'md',
        },
        {
          title: 'Sales Team',
          field: 'salesTeam',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.salesTeam}'
              }
            },
          },
          propsMap: {
            'rowData': 'value',
          },
          breakpoint: 'md',
        },
      ],
      actions: [
        {
          icon: 'check',
          tooltip: 'Click to select client',
          event: {
            via: 'api',
            name: 'onClientSelectedForNewQuote',
            paramsMap: {
              'selected': 'selectedClient'
            }
          }
        }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        selection: false,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1,
      },
      componentMap: {
        Toolbar: 'lasec-crm.ClientGridToolbar@1.0.0'
      },
      remoteData: true,
      query: 'client_list',
      variables: {
        'query.search': 'search',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize',
        'query.filterBy': 'filterBy',
        'query.filter': 'filter',
        'query.orderBy.field': 'orderBy',
        'query.orderDirection': 'orderDirection'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'clients': 'data',
        'repCode': 'repCode',
        'selectedClient': 'selectedClient'
      },
      resultType: 'object',
    },
  },
  selectedClient: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.id !== undefined ? "Click continue below to create a new quote for " + formData.fullName : "Select a client from the grid" }',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
        }
      },
      containerProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
        }
      }
    },
  },
};

export default uiSchema;
