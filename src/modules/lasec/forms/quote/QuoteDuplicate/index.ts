import { Reactory } from '@reactory/server-core/types/reactory'

const graphql = {
  query: {
    name: 'LasecGetCRMQuoteClients',
    text: `query LasecGetCRMQuoteClients($search: String, $repCode: String){
      LasecGetCRMQuoteClients(search: $search, repCode: $repCode){
        paging {
          total
          page
          hasNext
          pageSize
        }
        clients {
          id
          clientStatus
          clientName
          customerName
          repCode
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.repCode': 'repCode',
    },
    resultMap: {
      'paging': 'paging',
      '[]': 'clients',
      '[].id': 'clients[].id',
      '[].clientStatus': 'clients[].clientStatus',
    },
    autoQuery: false,
    queryMessage: 'Search for clients',
    resultType: 'array',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  }
};

const schema: Reactory.IObjectSchema = {
  title: '',
  type: 'object',
  properties: {
    code: {
      type: 'string',
      title: 'Quote Code:',
    },
    repCode: {
      type: 'string',
      title: 'Rep Codee'
    },
    search: {
      type: 'string',
      title: 'Search'
    },
    clients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          clientStatus: {
            type: 'string'
          },
          clientName: {
            type: 'string'
          },
          customerName: {
            type: 'string'
          },
          repCode: {
            type: 'string'
          },
        }
      },
    },
    selected: {
      type: "object",
      title: "Selected",
      properties: {
        id: {
          type: "string",
          title: "Client ID"
        },
        clientStatus: {
          type: 'string'
        },
        clientName: {
          type: "string",
          title: "Client Name"
        },
        customerName: {
          type: 'string'
        },
        repCode: {
          type: 'string'
        },
      }
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    toolbarPosition: 'none',
    componentType: "div",
    container: "div",
    showSubmit: false,
    showRefresh: false,
    containerStyles: {
      marginTop: '16px',
      padding: 0,
      boxShadow: 'none'
    },
    style: {
      padding: 0,
      margin: 0
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      repCode: { sm: 6 },
      search: { sm: 6 },
    },
    {
      clients: { sm: 12 },
    },
  ],

  repCode: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecSalesTeams {
        LasecSalesTeams {
          id
          title
          meta  {
            reference
          }
        }
      }`,
      resultItem: 'LasecSalesTeams',
      resultsMap: {
        'LasecSalesTeams.[].meta.reference': ['[].key', '[].value'],
        'LasecSalesTeams.[].title': '[].label',
      },
    },
  },
  search: {},
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
                    tooltip: 'Active'
                  },

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
          ],
        },
        { title: 'Client', field: 'clientName' },
        { title: 'Customer', field: 'customerName' },
        { title: 'Rep Code', field: 'repCode' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        //selection: true,
        //multiSelect: false,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1
      },
      // remoteData: false,
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.repCode': 'repCode',
        // 'formData.search': 'search',
        // 'formData.repCode': 'repCode',
      },
      resultMap: {
        '[]': 'data',
        '[].id': 'data[].id',
        '[].clientStatus': 'clients[].clientStatus',
        '[].clientName': 'clients[].clientName',
        '[].customerName': 'clients[].customerName',
        '[].repCode': 'clients[].repCode',
      },
      resultType: 'array',
      actions: [
        {
          icon: 'done_outline',
          tooltip: 'Select Customer',
          id: 'select_customer',
          iconProps: {
            color: '#5fb848'
          },
          event: {
            name: 'onClientSelected',
            via: 'form', // make either "form" || "amq"
            paramsMap: {
              'selected': 'formData.selected',
            },
          }
        },
      ],
    },
  }
};

const LasecQuoteDuplicateForm: Reactory.IReactoryForm = {
  id: 'LasecQuoteDuplicateForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quote Email',
  tags: ['Quote Email'],
  registerAsComponent: true,
  name: 'LasecQuoteDuplicateForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql: graphql,
  uiSchema: uiSchema,
  widgetMap: [],
};

export default LasecQuoteDuplicateForm;
