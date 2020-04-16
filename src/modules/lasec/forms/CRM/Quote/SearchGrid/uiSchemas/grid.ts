import {
  FilterByOptions,
} from '../shared';
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: true,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      search: { md: 8, sm: 12 },
      filterBy: { md: 4, sm: 12 },
      periodStart: { md: 6, xs: 12 },
      periodEnd: { md: 6, xs: 12 },
      dateFilter: { md: 6, xs: 12 },
      selectFilter: { md: 6, xs: 12 },
    },
    {
      quotes: {
        md: 12
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
  dateFilter: {
    'ui:widget': 'DateSelectorWidget',
  },
  selectFilter: {
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
  periodStart: {
    'ui:widget': 'DateSelectorWidget',
  },
  periodEnd: {
    'ui:widget': 'DateSelectorWidget',
  },
  quotes: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Quote Number', field: 'code' },
        {
          title: 'Quote Date',
          field: 'date',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.date).format(\'DD MMM YYYY HH:mm\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        // TODO - NEED A LIST OF POTENTIAL QUOTE STATUS TYPES
        {
          title: 'Quote Status', field: 'status',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'Draft - Pending Submission',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Draft - Pending Submission'
                  },
                  {
                    key: 'Open - Submitted Quote',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Open - Submitted Quote'
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
                'rowData.status': 'value',
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
                    id: 'draft',
                    key: 'Draft - Pending Submission',
                    title: 'Draft - Pending Submission',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#5EB848'
                      }
                    }
                  },
                  {
                    id: 'Open - Submitted Quote',
                    key: 'Open - Submitted Quote',
                    title: 'Open - Submitted Quote',
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
            'rowData.status': 'selectedKey'
          }
        },
        {
          title: 'Total Quote Value', field: 'total',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.total': 'value',
          },
        },
        { title: 'Client', field: 'client' },
        { title: 'Customer', field: 'companyTradingName' },
        // { title: 'Account Number', field: 'accountNumber' },
        {
          title: 'Quote Type', field: 'quoteType',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'Normal',
                    icon: 'trip_origin',
                    style: {
                      color: '#904095'
                    },
                    tooltip: 'Normal'
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
                'rowData.quoteType': 'value',
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
                    id: 'normal',
                    key: 'Normal',
                    title: 'Normal',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#904095'
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
            'rowData.quoteType': 'selectedKey'
          }
        },
        { title: 'Rep Code', field: 'repCode' },
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
        // 'quotes': 'data',
        'quotes[].code': 'data[].code',
        'quotes[].created': 'data[].date',
        'quotes[].statusName': 'data[].status',
        'quotes[].totalVATInclusive': 'data[].total',
        'quotes[].repCode': 'data[].repCode',
        'quotes[].quoteType': 'data[].quoteType',
        // 'quotes[].accountNumber': 'data[].accountNumber',
        'quotes[].customer.fullName': 'data[].client',
        'quotes[].company.tradingName': 'data[].companyTradingName',

      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
