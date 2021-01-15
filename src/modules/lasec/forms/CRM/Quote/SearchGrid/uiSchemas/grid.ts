import {
  FilterByOptions,
} from '../shared';
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
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
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 0
  },
  'ui:grid-layout': [
    {
      quotes: {
        md: 12
      }
    }
  ],
  search: {
    'ui:widget': 'HiddenWidget',
    // 'ui:options': {
    //   showLabel: false,
    //   icon: 'search',
    //   component: "TextField",
    //   componentProps: {
    //     placeholder: 'Search',
    //     variant: "outlined",
    //     type: 'search',
    //     style: {
    //       minWidth: '180px'
    //     }
    //   }
    // }
  },
  paging: {
    'ui:widget': 'HiddenWidget'
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

        {
          title: 'Quote Number',
          field: 'code',
          width: '160px',
          component: 'lasec-crm.QuoteActionButton',
          props: {
            variant: 'body1',
            style: {
              maxWidth: '170px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }
          },
          propsMap: {
            'rowData.code': 'quote_id',
            'rowData': 'formData'
          }
        },
        {
          title: 'Quote Date',
          field: 'created',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                containerProps: {
                  style: {
                    maxWidth: '140px'
                  },
                },
                format: '${api.utils.moment(rowData.date).format(\'DD-MM-YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        {
          title: 'Quote Status', field: 'status',
          width: '140px',
          components: [
            {
              component: 'lasec-crm.QuoteStatus@1.0.0',
              props: {
                usecase: 'grid'
              },
              propsMap: {
                'rowData.status': 'value',
                'rowData': 'quote'
              },
            },
          ],
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
        toolbar: true,
        selection: true,
        pageSize: 10,
      },
      actions: [
        {
          icon: 'remove_circle',
          tooltip: 'Deactivate Client(s)',
          key: 'deactivate',
          confirmation: {
            title: 'Are you sure you want to delete ${selected.length === 1 ? "this quote" : "these quotes"}?',
            titleProps: {
              style: {
                fontWeight: 'bold'
              }
            },
            content: 'Once a quote is deleted you will no longer be able to acces the quote information',
            contentProps: {
              style: {
                color: '#BCBCBC'
              }
            },
            acceptTitle: 'DELETE ALL',
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
      remoteData: true,
      query: 'quotes',
      componentMap: {
        Toolbar: 'lasec-crm.QuoteGridToolbar@1.0.0'
      },
      variables: {
        'query.search': 'search',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize',
        'query.filterBy': 'filterBy',
        'query.filter': 'filter',
        'query.periodStart': 'periodStart',
        'query.periodEnd': 'periodEnd',
        'query.dateFilter': 'quoteDate',
        'query.orderBy.field': 'orderBy',
        'query.orderDirection': 'orderDirection'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'quotes[].code': 'data[].code',
        'quotes[].created': 'data[].date',
        'quotes[].statusName': 'data[].statusName',
        'quotes[].allowed_statuses[]': 'data[].allowed_statuses',
        'quotes[].status': 'data[].status',
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
