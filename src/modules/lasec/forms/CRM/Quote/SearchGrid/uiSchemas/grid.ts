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
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      paging: { md: 2, sm: 12 },
      search: { md: 4, sm: 12 },
      filterBy: { md: 4, sm: 12 },
    },
    {
      quotes: {
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
        { key: 'my_quotes', value: 'my_quotes', label: 'My Quptes' },
        { key: 'all_quotes', value: 'all_quotes', label: 'All Quotes' },
      ],
    },
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
                format: '${props.api.utils.moment(rowData.date).format(\'DD MMM YYYY HH:mm\')}'
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
        {
          title: 'Quote Type', field: 'type',
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
                'rowData.type': 'value',
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
            'rowData.status': 'selectedKey'
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
        'quotes[].sales_team_id': 'data[].repCode',
        'quotes[].quote_type': 'data[].type',
        // 'quotes[].salesTeam': 'data[].type',
        // 'quotes[].quote_type': 'data[].type',

        'quotes[].customer.fullName': 'data[].customerName',

      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
