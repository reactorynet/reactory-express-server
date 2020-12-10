import {
  FilterByOptions,
} from '../shared';
const uiSchema: any = {
  'ui:options': {
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
      clients: {
        xs: 12, sm: 12, md: 12, lg: 12
      }
    }
  ],
  search: {
    'ui:widget': 'HiddenWidget',
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
    'ui:widget': 'HiddenWidget',
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
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      selectOptions: FilterByOptions,
    },
  },
  filter: {
    'ui:widget': 'HiddenWidget',
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
        {
          title: 'Client Full Name',
          field: 'fullName',
          component: 'lasec-crm.LasecClientLabel@1.0.0',
          props: {},
          propsMap: {
            'rowData': 'formData',
          },
        },
        { title: 'Email Address', 
          field: 'emailAddress',
          breakpoint: 'sm',
          component: 'lasec-crm.LasecClientLabel@1.0.0', 
          props: {
            dataLabelField: 'emailAddress',
            displayIcon: false
          },
          propsMap: {
            'rowData': 'formData',
          },
        },
        { title: 'Client Rep Code', 
          field: 'salesTeam',
          breakpoint: 'sm',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData && rowData.salesTeam ? rowData.salesTeam : "No Rep Code"}'
              }
            },
          },
          propsMap: {
            'rowData': 'formData',
          },     
        },
        {
          title: 'Customer',
          field: 'customer',
          component: 'lasec-crm.CustomerLabel@1.0.0',          
          propsMap: {
            'rowData.customer': ['customer', 'formData'],            
          },
          props: {
            'use_case': 'grid'
          },
          breakpoint: 'md',
        },
        { title: 'Customer Rep Code', 
          field: 'company_rep_code',
          breakpoint: 'md',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.customer && rowData.customer.salesTeam ? rowData.customer.salesTeam : "No Rep Code"}'
              }
            },
          },
          propsMap: {
            'rowData': 'formData',
          },          
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
          title: 'Country',
          field: 'country',
          breakpoint: 'md',

        }
      ],      
      actions: [
        {
          icon: 'remove_circle',
          tooltip: 'Deactivate Client(s)',
          key: 'deactivate',          
          confirmation: {
            title: 'Are you sure you want to deactivate ${selected.length === 1 ? "this client" : "these clients"}?',
            titleProps: {
              style: {
                fontWeight: 'bold'
              }
            },
            content: 'Once a client is deactivated you will no longer be able to acces the client information', 
            contentProps: {
              style:{
                color: '#BCBCBC'
              }
            },
            acceptTitle: 'DEACTIVATE CLIENT',
            confirmProps: {
              variant: 'contained',
              style: {
                backgroundColor: '#D22D2C',
                color: '#FFF'
              }
            },
            confirmColor: 'danger',
            cancelTitle: 'CANCEL',
            cancelProps: {
              variant: 'text'
            }
          },
          iconProps: {
            color: 'error'
          },      
          mutation: 'deactivate',          
        },
      ],
      options: {
        grouping: false,
        search: true,        
        showTitle: false,
        toolbar: true,
        selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1,
        pageSize: 10,
      },
      componentMap: {
        Toolbar: 'lasec-crm.ClientGridToolbar@1.0.0'
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.filter': 'filter',
        'query.orderBy.field': 'orderBy',
        'query.orderDirection': 'orderDirection'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'clients': 'data',
        'clients[].customer.salesTeam': 'data[].company_rep_code'
      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
