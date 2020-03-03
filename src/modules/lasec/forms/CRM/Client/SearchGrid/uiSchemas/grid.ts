const uiSchema: any = {
  'ui:options': {    
    componentType: "div",    
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    }
  },
  'ui:field':'GridLayout',
  'ui:grid-layout': [
    { 
      paging: { md: 2, sm: 12 },
      search: { md: 4, sm: 12 },
      filterBy: { md: 4, sm: 12 },
    },
    {
      clients: {
        md: 12
      }
    }
  ],  
  search: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData && formData.length > 3 ? "Searching for `" + formData + "`" : "Enter search keyword" }',
      variant: 'body1',      
    }    
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  filterBy: {
    'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          { key: 'activity_status', value: 'activity_status', label: 'Client Status' },
          { key: 'fullname', value: 'fullname', label: 'Client Full name' },
          { key: 'email', value: 'email', label: 'Email Address' },
          { 
            key: 'company_trading_name', 
            value: 'company_trading_name', 
            label: 'Customer' 
          },
          { key: 'account_number', value: 'account_number', label: 'Account Number' },
          { key: 'company_on_hold', value: 'company_on_hold', label: 'Company Status' },
          { key: 'country', value: 'country', label: 'Country' },
          { key: 'currency', value: 'currency', label: 'Currency' },
          { key: 'company_sales_team', value: 'company_sales_team', label: 'Customer Rep Code' },
        ],
      },
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
            },
            {
              component: 'core.DropDownMenu',
              props: {
                style: {                  
                  marginTop: '-10px',
                },
                menus: [
                  {
                    id: 'active',
                    key: 'active',
                    title: 'Active',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#5EB848'  
                      }
                    }                    
                  },
                  {
                    id: 'unfinished',
                    key: 'unfinished',
                    title: 'Unfinished',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#FF9901'  
                      }
                    }  

                  },
                  {
                    id: 'deactivated',
                    key: 'deactivated',
                    title: 'Deactivate',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'  
                      }
                    },  
                  },
                ]  
              }
            }
          ],                  
          propsMap: {
            'rowData.clientStatus': 'selectedKey'
          }                    
        },        
        { 
          title: 'Client Full Name', 
          field: 'fullName',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMClientDetail@1.0.0',
            componentProps: {
              'rowData.id': 'formData.id'
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.fullName}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
              }
            },
            windowTitle: 'Client details: ${rowData.fullName}',
          }, 
          propsMap: {
            'rowData': 'rowData',
          }
        },
        { title: 'Email Address', field: 'emailAddress' },
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
          }          
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
          }            
        },
        {
          title: 'Customer Status',
          field: 'customer',
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
          field: 'country'
        }        
      ],
      options: {
        grouping: false,
        search: false,  
        showTitle: false,
        toolbar: false,
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy'
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