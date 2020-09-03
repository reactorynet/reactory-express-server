import { SalesHistoryFilterByOptions } from '../shared';

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    // {
    //   search: { md: 4, sm: 12 },
    //   filterBy: { md: 4, sm: 12 },
    //   filter: { md: 4, sm: 12 },
    //   periodStart: { md: 6, xs: 12 },
    //   periodEnd: { md: 6, xs: 12 },
    //   // dateFilter: { md: 6, xs: 12 },
    //   client: { md: 6, xs: 12 },
    //   customer: { md: 6, xs: 12 },
    // },
    {
      salesHistory: { xs: 12, sm: 12, md: 12, lg: 12 }
    }
  ],

  paging: {
    'ui:widget': 'HiddenWidget'
  },
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
  filterBy: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: SalesHistoryFilterByOptions,
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

  salesHistory: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Account Number', field: 'accountNumber' },
        { title: 'Customer', field: 'customer' },
        { title: 'Client Full Name', field: 'client' },
        { title: 'Invoice Number', field: 'invoiceNumber' },
        { title: 'ISO No.', field: 'isoNumber' },
        { title: 'PO Number', field: 'poNumber' },
        {
          title: 'Order Date',
          field: 'orderDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.orderDate).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.orderDate': 'value',
          }
        },
      ],
      options: {
        // grouping: false,
        // search: false,
        // showTitle: false,
        // toolbar: false,
        grouping: false,
        search: true,
        showTitle: false,
        toolbar: true,
        selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1
      },
      componentMap: {
        Toolbar: 'lasec-crm.SalesHistoryGridToolbar@1.0.0'
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.id': 'clientId',
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.filter': 'filter',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.year': 'year',
        'props.formContext.$formData.month': 'month',
        'props.formContext.$formData.years': 'years',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.periodStart': 'periodStart',
        'props.formContext.$formData.periodEnd': 'periodEnd',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'year': 'year',
        'month': 'month',
        'years': 'years',
        'salesHistory.[].id': 'data.[].id',
        'salesHistory.[].accountNumber': 'data.[].accountNumber',
        'salesHistory.[].customer': 'data.[].customer',
        'salesHistory.[].client': 'data.[].client',
        'salesHistory.[].invoiceNumber': 'data.[].invoiceNumber',
        'salesHistory.[].iso': 'data.[].isoNumber',
        'salesHistory.[].poNumber': 'data.[].poNumber',
        'salesHistory.[].orderDate': 'data.[].orderDate',
      },
    },
  }
};

export default uiSchema;
