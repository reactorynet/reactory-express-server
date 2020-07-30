

const uiSchema: any = {
  'ui:options': {
    showRefresh: false,
    submitIcon: 'check',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      repCode: { lg: 6, md: 6, sm: 12, xs: 12 },
      search: { lg: 6, md: 6, sm: 12, xs: 12 },
    },
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
        multi: false
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
        actionsColumnIndex: -1
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.filter': 'filter',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'clients': 'data',
      },
      resultType: 'object',
    },
  },
  selectedClient: {
    'ui:widget': 'LasecClientLabel',
  }, 
};

export default uiSchema;
