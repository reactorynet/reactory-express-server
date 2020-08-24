import {
  FilterByOptions,
} from '../shared';
const uiSchema: any = {
  'ui:options': {
    submitIcon: 'search',
    componentType: "form",
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      marginTop: '16px'
    },
    style: {
      marginTop: '16px'
    }
  },
  'ui:field':'GridLayout',
  'ui:grid-layout': [
    {
      search: { md: 4, sm: 12 },
      filterBy: { md: 4, sm: 12 },
      filter: { md: 4, sm: 12 },
    },
    {
      clients: {
        xs: 12, sm: 12, md: 12, lg: 12
      }
    }
  ],
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Search',
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
    /*
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData && formData.length > 3 ? "Searching for `" + formData + "`" : "Enter search keyword" }',
      variant: 'body1',
    }
    */
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  submit: {
    'ui:widget': 'FormSubmitWidget',
    'ui:options': {
      text: 'SEARCH',
      color: 'default',
      props: {
        color: 'default',
        style: {
          maxWidth: '180px',
          width: '180px'
        }
      }
    }
  },
  filterBy: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: FilterByOptions,
    },
  },
  filter: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerFilterLookup($filterBy: String!) {
        LasecGetCustomerFilterLookup(filterBy: $filterBy) {
          id
          name
        }
      }`,
      propertyMap: {
        'formContext.$formData.filterBy': 'filterBy'
      },
      resultItem: 'LasecGetCustomerFilterLookup',
      resultsMap: {
        'LasecGetCustomerFilterLookup.[].id': ['[].key', '[].value'],
        'LasecGetCustomerFilterLookup.[].name': '[].label',
      },
    },
  },
  clients: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        /*
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
          breakpoint: 'xs',


        }, */
        {
          title: 'Client Full Name',
          field: 'fullName',
          component: 'lasec-crm.LasecClientLabel@1.0.0',
          props: {
            //componentFqn: 'lasec-crm.LasecCRMClientDetail@1.0.0',
            /*
            componentProps: {
              'rowData.id': ['formData.id', 'formData.client.id'],              
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
            */
          },
          propsMap: {
            'rowData': 'formData',
          },
        },
        { title: 'Email Address', field: 'emailAddress', breakpoint: 'sm' },
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
          title: 'Account Number',
          field: 'customer',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.customer && rowData.customer.accountNumber ? rowData.customer.accountNumber : "No Account #"}'
              }
            },
          },
          propsMap: {
            'rowData': 'value',
          },
          breakpoint: 'md',
        },
        {
          title: 'Customer Status',
          field: 'customer',
          breakpoint: 'xs',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'not-on-hold',
                    icon: 'fiber_manual_record',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Not on hold'
                  },
                  {
                    key: 'on-hold',
                    icon: 'fiber_manual_record',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'On hold'
                  },
                ]
              },
              style: {
                marginRight: '8px',
              },
              propsMap: {
                'rowData.customer.customerStatus': 'value',
              },
            },
          ],
          propsMap: {
            'rowData': 'value',
          }
        },
        {
          title: 'Country',
          field: 'country',
          breakpoint: 'md',

        }
      ],      
      actions: [
        {
          icon: 'remove_circle',
          tooltip: 'Deactivate Client(s)',          
          confirmation: {
            message: 'Are you sure you want to deactivate (${selected.length}) ${selected.length === 1 ? "client" : "clients"}?',
            acceptTitle: 'Yes',
            confirmColor: 'danger',
            cancelTitle: 'No'
          },
          iconProps: {
            color: 'error'
          },
          mutation: 'deactivate',          
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        selection: true,
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
  }
};

export default uiSchema;
