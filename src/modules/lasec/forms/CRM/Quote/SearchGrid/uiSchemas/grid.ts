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
      client: { md: 6, xs: 12 },
      customer: { md: 6, xs: 12 },
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
  client: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Client',
      title: 'Search for a Client'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMClientLookupTable@1.0.0',
      componentProps: {},
    },
  },
  customer: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Customer',
      title: 'Search for a Customer'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMCustomerLookupTable@1.0.0',
      componentProps: {},
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
                format: '${api.utils.moment(rowData.date).format(\'DD MMM YYYY HH:mm\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
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
                    key: 'Draft - Awaiting Approval',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Draft - Awaiting Approval'
                  },
                  {
                    key: 'Draft - Approved',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Draft - Approved'
                  },
                  {
                    key: 'Draft - Declined',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Draft - Declined'
                  },
                  {
                    key: 'Open - Submitted Quote',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Open - Submitted Quote'
                  },
                  {
                    key: 'Open - Under Assessement',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Open - Under Assessement'
                  },
                  {
                    key: 'Open - Budget Timeline',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Open - Budget Timeline'
                  },
                  {
                    key: 'Open - Price Negotiation',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Open - Price Negotiation'
                  },
                  {
                    key: 'Open - Awaiting PO',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Open - Awaiting PO'
                  },
                  {
                    key: 'Open - PO Received',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Open - PO Received'
                  },
                  {
                    key: 'Lost - Price',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Lost - Price'
                  },
                  {
                    key: 'Lost - No Funds',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Lost - No Funds'
                  },
                  {
                    key: 'Lost - No Stock',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Lost - No Stock'
                  },
                  {
                    key: 'Lost - No Info',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Lost - No Info'
                  },
                  {
                    key: 'Lost - Lead Time',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Lost - Lead Time'
                  },
                  {
                    key: 'Lost - Other',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Lost - Other'
                  },
                  {
                    key: 'Accepted',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Accepted'
                  },
                  {
                    key: 'Accepted - Fully',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Accepted - Fully'
                  },
                  {
                    key: 'Accepted - Partially',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Accepted - Partially'
                  },
                  {
                    key: 'Accepted - Jobcard',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Accepted - Jobcard'
                  },
                  {
                    key: 'Expired',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Expired'
                  },
                  {
                    key: 'Expired - Waiting Feedback',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Expired - Waiting Feedback'
                  },
                  {
                    key: 'Expired - Waiting Budget',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Expired - Waiting Budget'
                  },
                  {
                    key: 'Deleted',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Deleted'
                  },
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
                    id: 'Draft - Pending Submission',
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
                    id: 'Draft - Awaiting Approval',
                    key: 'Draft - Awaiting Approval',
                    title: 'Draft - Awaiting Approval',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#FF9901'
                      }
                    }

                  },
                  {
                    id: 'Draft - Approved',
                    key: 'Draft - Approved',
                    title: 'Draft - Approved',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Draft - Declined',
                    key: 'Draft - Declined',
                    title: 'Draft - Declined',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Open - Submitted Quote',
                    key: 'Open - Submitted Quote',
                    title: 'Open - Submitted Quote',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Open - Under Assessement',
                    key: 'Open - Under Assessement',
                    title: 'Open - Under Assessement',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Open - Budget Timeline',
                    key: 'Open - Budget Timeline',
                    title: 'Open - Budget Timeline',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Open - Price Negotiation',
                    key: 'Open - Price Negotiation',
                    title: 'Open - Price Negotiation',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Open - Awaiting PO',
                    key: 'Open - Awaiting PO',
                    title: 'Open - Awaiting PO',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Open - PO Received',
                    key: 'Open - PO Received',
                    title: 'Open - PO Received',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Lost - Price',
                    key: 'Lost - Price',
                    title: 'Lost - Price',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Lost - No Funds',
                    key: 'Lost - No Funds',
                    title: 'Lost - No Funds',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Lost - No Stock',
                    key: 'Lost - No Stock',
                    title: 'Lost - No Stock',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Lost - No Info',
                    key: 'Lost - No Info',
                    title: 'Lost - No Info',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Lost - Lead Time',
                    key: 'Lost - Lead Time',
                    title: 'Lost - Lead Time',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Lost - Other',
                    key: 'Lost - Other',
                    title: 'Lost - Other',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Accepted',
                    key: 'Accepted',
                    title: 'Accepted',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Accepted - Fully',
                    key: 'Accepted - Fully',
                    title: 'Accepted - Fully',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Accepted - Partially',
                    key: 'Accepted - Partially',
                    title: 'Accepted - Partially',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Accepted - Jobcard',
                    key: 'Accepted - Jobcard',
                    title: 'Accepted - Jobcard',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Expired',
                    key: 'Expired',
                    title: 'Expired',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Expired - Waiting Feedback',
                    key: 'Expired - Waiting Feedback',
                    title: 'Expired - Waiting Feedback',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Expired - Waiting Budget',
                    key: 'Expired - Waiting Budget',
                    title: 'Expired - Waiting Budget',
                    icon: 'trip_origin',
                    iconProps: {
                      style: {
                        color: '#AB1257'
                      }
                    },
                  },
                  {
                    id: 'Deleted',
                    key: 'Deleted',
                    title: 'Deleted',
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
        { title: 'Account Number', field: 'accountNumber' },
        { title: 'Quote Type', field: 'quoteType' },
        { title: 'Rep Code', field: 'repCode' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        selection: true
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.periodStart': 'periodStart',
        'props.formContext.$formData.periodEnd': 'periodEnd',
        'props.formContext.$formData.dateFilter': 'quoteDate',
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
        'quotes[].customer.fullName': 'data[].client',
        'quotes[].company.tradingName': 'data[].companyTradingName',
        'quotes[].company.code': 'data[].accountNumber',
        'quotes[].meta.source.sales_team_id': 'data[].repCode',
        'quotes[].meta.source.quote_type': 'data[].quoteType',

      },
      resultType: 'object',
    },
  }
};

export default uiSchema;
