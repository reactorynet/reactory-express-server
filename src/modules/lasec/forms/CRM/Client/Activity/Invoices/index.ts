import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql from './graphql';
import $schema from './schema';
import { InvoiceFilterByOptions } from '../shared';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

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
    {
      invoices: { xs: 12 }
    }
  ],

  invoices: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Invoice Date',
          field: 'invoiceDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.invoiceDate ? api.utils.moment(rowData.invoiceDate).format(\'DD MMM YYYY\') : ""}'
              }
            },
          },
          propsMap: {
            'rowData.invoiceDate': 'value',
          }
        },
        {
          title: 'Invoice Number',
          field: 'isoNumber',
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
            buttonTitle: '${rowData.id}',
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body1',
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
              }
            },
            windowTitle: 'Details view for Invoice # ${rowData.id}',
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        { title: 'PO Number', field: 'poNumber' },
        {
          title: 'Sales Order Number',
          field: 'isoNumber',
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
            buttonTitle: '${rowData.isoNumber}',
            buttonVariant: 'Typography',
            buttonProps: {
              variant: 'body1',
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black',
              }
            },
            windowTitle: 'Details view for Order # ${rowData.isoNumber}',
          },
          propsMap: {
            'rowData': 'rowData'
          }
        },
        {
          title: 'Inv Value',
          field: 'value',
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            'rowData.value': 'value',
          },
        },
        { title: 'Quote Number', field: 'quoteId' },
        {
          title: 'Quote Date',
          field: 'quoteDate',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${rowData.quoteDate ? api.utils.moment(rowData.quoteDate).format(\'DD MMM YYYY\') : ""}'
              }
            },
          },
          propsMap: {
            'rowData.quoteDate': 'value',
          }
        },
        { title: 'Account Number', field: 'accountNumber' },
        { title: 'Customer', field: 'customer' },

      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
      },
      componentMap: {
        Toolbar: 'lasec-crm.InvoiceGridToolbar@1.0.0',
      },
      toobarPropsMap: {
        'formContext.formData.id': 'query.id',
        'formContext.formData.salesTeam': 'query.salesTeam',
        'formContext.formData.search': 'query.search',
        'toolbarProps.filterBy': 'query.filterBy',
        'formContext.formData.filter': 'query.filter',
        'toolbarProps.use_case': 'use_case',
      },
      toolbarProps: {
        filterBy: 'client_id',
        use_case: 'client_activity',
      },
      remoteData: true,
      query: 'client_invoices',
      variables: {
        'query.id': 'clientId',
        'query.salesTeam': 'salesTeamId',
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
        'clientId': ['id', 'query.id'],
        'invoices': 'data',
      },
    },
  }
};

const LasecCRMClienInvoiceActivities: Reactory.IReactoryForm = {
  id: 'LasecCRMClienInvoiceActivities',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360',
      name: 'reactory.plugin.lasec360',
      type: 'script',
      uri: `${ENVIRONMENT.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
  title: 'CMS Client Activities Invoices',
  tags: ['CMS Client Activities Invoices'],
  registerAsComponent: true,
  name: 'LasecCRMClienInvoiceActivities',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    filterBy: "any_field",
    invoices: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecCRMClienInvoiceActivities;
