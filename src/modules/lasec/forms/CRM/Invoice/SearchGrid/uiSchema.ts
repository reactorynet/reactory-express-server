const uiSchema: any = {
  'ui:options': {
    componentType: 'div',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px',
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
      },
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
    {
      invoices: { xs: 12 },
    },
  ],

  invoices: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Invoice Date',
          field: 'invoiceDate',
          width: '140px',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.invoiceDate ? api.utils.moment(rowData.invoiceDate).format(\'DD-MM-YYYY\') : ""}', // eslint-disable-line
              },
            },
          },
          propsMap: {
            'rowData.invoiceDate': 'value',
          },
        },
        // { title: 'Invoice Number', field: 'id' },
        {
          title: 'Invoice Number',
          field: 'isoNumber',
          width: '140px',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.id': ['data.id', 'query.id'],
              'rowData.quoteId': ['data.quoteId', 'query.quoteId'],
              'rowData.isoNumber': ['data.orderId', 'query.orderId'],
              'rowData.iso': ['data.iso', 'query.iso'],
              'rowData.documentIds': ['data.documentIds', 'query.documentIds'],
              'rowData.poNumber': ['data.poNumber', 'query.poNumber'],
              'rowData.orderDate': ['data.orderDate', 'query.orderDate'],
              'rowData.customer': ['data.customer', 'query.customer'],
              'rowData.client': ['data.client', 'query.client'],
              'rowData.orderStatus': ['data.orderStatus', 'query.orderStatus'],
              'rowData.currency': ['data.currency', 'query.currency'],
              'rowData.orderType': ['data.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['data.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['data.warehouseNote', 'query.warehouseNote'],
              'rowData.deliveryNote': ['data.deliveryNote', 'query.deliveryNote'],
              'rowData.salesTeam': ['data.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.id}', // eslint-disable-line
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body2',
              style: {
                textDecoration: 'underline',
                cursor: 'pointer',
                color: 'black',
                maxWidth: '140px',
              },
            },
            windowTitle: 'Details view for Invoice # ${rowData.id}', // eslint-disable-line
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Invoices', '${rowData.id}'], // eslint-disable-line
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } } },
            },
          },
          propsMap: {
            rowData: 'rowData',
          },
        },
        { title: 'Purchase Order #', field: 'poNumber', breakpoint: 'sm' },
        {
          title: 'Sales Order #',
          field: 'isoNumber',
          width: '140px',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMISODetail@1.0.0',
            componentProps: {
              'rowData.id': ['data.id', 'query.id'],
              'rowData.quoteId': ['data.quoteId', 'query.quoteId'],
              'rowData.isoNumber': ['data.orderId', 'query.orderId'],
              'rowData.iso': ['data.iso', 'query.iso'],
              'rowData.documentIds': ['data.documentIds', 'query.documentIds'],
              'rowData.poNumber': ['data.poNumber', 'query.poNumber'],
              'rowData.orderDate': ['data.orderDate', 'query.orderDate'],
              'rowData.customer': ['data.customer', 'query.customer'],
              'rowData.client': ['data.client', 'query.client'],
              'rowData.orderStatus': ['data.orderStatus', 'query.orderStatus'],
              'rowData.currency': ['data.currency', 'query.currency'],
              'rowData.orderType': ['data.orderType', 'query.orderType'],
              'rowData.deliveryAddress': ['data.deliveryAddress', 'query.deliveryAddress'],
              'rowData.warehouseNote': ['data.warehouseNote', 'query.warehouseNote'],
              'rowData.deliveryNote': ['data.deliveryNote', 'query.deliveryNote'],
              'rowData.salesTeam': ['data.salesTeam', 'query.salesTeam'],
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.isoNumber}', // eslint-disable-line
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body2',
              style: {
                textDecoration: 'underline',
                cursor: 'pointer',
                color: 'black',
                maxWidth: '140px',
              },
            },
            windowTitle: 'Sales Order# ${rowData.isoNumber} - Detail View', // eslint-disable-line
            backNavigationConfig: {
              showAppBar: false,
              backNavigationItems: ['Invoices', '${rowData.id}'], // eslint-disable-line
              containerProps: { PaperProps: { style: { background: '#F6F6F6' } } },
            },
          },
          propsMap: {
            rowData: 'rowData',
          },
        },
        {
          title: 'Quote Number',
          field: 'quoteId',
          component: 'core.LabelComponent@1.0.0',
          breakpoint: 'sm',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.quoteId}' // eslint-disable-line
              },
            },
          },
        },

        { title: 'Customer', field: 'customer', breakpoint: 'md' },
        { title: 'Account Number', field: 'accountNumber', breakpoint: 'md' },
        { title: 'Client', field: 'client', breakpoint: 'md' },
        { title: 'Client Rep Code', field: 'salesTeamId', breakpoint: 'md' },
        {
          title: 'Inv Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.value': 'value',
          },
        },
        { title: 'MUP %', field: 'mup', breakpoint: 'md' },
        { title: 'GP %', field: 'gp', breakpoint: 'md' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        pageSize: 10,
      },
      remoteData: true,
      query: 'invoices',
      componentMap: {
        Toolbar: 'lasec-crm.InvoiceGridToolbar@1.0.0',
      },
      variables: {
        'query.search': 'search',
        'query.filter': 'filter',
        'query.filterBy': 'filterBy',
        'query.paging': 'paging',
        'query.periodStart': 'periodStart',
        'query.periodEnd': 'periodEnd',
        'query.dateFilter': 'dateFilter',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'invoices.[].id': 'data.[].id',
        'invoices.[].invoiceDate': 'data.[].invoiceDate',
        'invoices.[].quoteDate': 'data.[].quoteDate',
        'invoices.[].quoteId': 'data.[].quoteId',
        'invoices.[].customer': 'data.[].customer',
        'invoices.[].client': 'data.[].client',
        'invoices.[].dispatches': 'data.[].dispatches',
        'invoices.[].accountNumber': 'data.[].accountNumber',
        'invoices.[].salesTeamId': 'data.[].salesTeamId',
        'invoices.[].poNumber': 'data.[].poNumber',
        'invoices.[].isoNumber': 'data.[].isoNumber',
        'invoices.[].value': 'data.[].value',
        'invoices.[].gp': 'data.[].gp',
        'invoices.[].mup': 'data.[].mup',
      },
    },
  },
};

export default uiSchema;
