import { Reactory } from '@reactory/server-core/types/reactory'

const graphql = {
  query: {
    name: 'LasecGetCRMQuoteClients',
    text: `query LasecGetCRMQuoteClients($search: String!, $repCode: String){
      LasecGetCRMQuoteClients(search: $search, repCode: $repCode){
        id
        clientStatus
        clientName
        customerName
        repCode
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.repCode': 'repCode',
    },
    resultMap: {
      '[]': 'clients',
      // 'quotes[].code': 'quotes[].code',
    },
    autoQuery: true,
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
    }
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
      padding: 0,
      marginTop: 0,
      boxShadow: 'none'
    },
    style: {
      marginTop: 0
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      repCode: { sm: 6 },
      search: { sm: 6 },
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
