import { Reactory } from '@reactory/server-core/types/reactory'
import $graphql, { clientLookupGraphQL } from './graphql';

const uiSchema: any = {
  'ui:graphql': clientLookupGraphQL,
  'ui:options': {
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    submitIcon: 'search',
    componentType: "form",
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [    
    { clients: { sm: 12 } },
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
  clients: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: "Client Name", field: "fullName" },
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
      ],
      options: {
        grouping: false,
        search: true,
        showTitle: false,
        toolbar: true,
        // selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1
      },
      actions: [
        {
          icon: 'done_outline',
          tooltip: 'Select Client',
          iconProps: {
            color: 'success'
          },
          mutation: 'onSelectClient',
          variables: {
            'selected': 'newClient.customer',
          },
        },
      ],
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'clients': 'data',
      },
      resultType: 'object',
    }
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    search: {
      type: 'string',
      title: 'Search'
    },
    paging: {
      type: 'object',
      title: 'Paging',
      properties: {
        total: {
          type: 'number'
        },
        page: {
          type: 'number'
        },
        pageSize: {
          type: 'number'
        },
        hasNext: {
          type: 'boolean'
        }
      }
    },
    clients: {
      type: 'array',
      items: {
        id: {
          type: "string",
          title: "Customer Id"
        },
        fullName: {
          type: "string",
          title: "Name"
        },
      },
    }
  }
};

const LasecCRMClientLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMClientLookupTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client Lookup Table',
  tags: ['CRM Client Lookup Table'],
  registerAsComponent: true,
  name: 'LasecCRMClientLookupTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  graphql: $graphql,
  widgetMap: [],
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    customers: []
  }
};

export default LasecCRMClientLookupForm;
