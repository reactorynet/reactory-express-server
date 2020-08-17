import { Reactory } from '@reactory/server-core/types/reactory';

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    onChange: {
      name: "LasecUpdateQuote",
      text: `mutation LasecUpdateQuote($itemId: String, $quoteType: String, $repCode: String, $clientId: String, $validDate: String){
        LasecUpdateQuote(item_id: $itemId, quote_type: $quoteType, rep_code: $repCode, client_id: $clientId, valid_date: $validDate) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating freight request quote',
      variables: {
        // 'eventData.formData': 'newClient.address',
        'eventData.formData.code': 'itemId',
        'eventData.formData.quoteType': 'quoteType',
        'eventData.formData.repCode': 'repCode',
        'eventData.formData.client': 'clientId',
        'eventData.formData.validDate': 'validDate',
      },
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Quote successfully updated.',
        props: {
          timeOut: 5000,
          canDismiss: false,
        }
      },
    },
  },
};

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    code: {
      type: 'string',
      title: 'Code'
    },
    client: {
      type: 'string',
      title: 'Show'
    },
    repCode: {
      type: "string",
      title: "Rep Code"
    },
    quoteType: {
      type: "string",
      title: "Quote Type"
    },
    validDate: {
      type: "string",
      title: "Quote Valid Date"
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    container: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: 0,
      margin: 0,
    },
    style: {
      margin: 0,
      padding: 0
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 2,
    container: 'div',
    containerStyles: {
      padding: 0,
      margin: 0,
      border: "none",
      boxShadow: "none"
    }

  },
  'ui:grid-layout': [
    {
      code: { xs: 12, sm: 6, },
      client: { xs: 12, sm: 6, },
      repCode: { xs: 12, sm: 6, },
      quoteType: { xs: 12, sm: 6, },
      validDate: { xs: 12, sm: 6, },
    },
  ],

  code: {},

  client: {
    'ui:widget': 'LookupComponent',
    'ui:options': {
      label: 'Select a Client',
      placeholder: 'Select a Client',
      title: 'Search for a Client'
    },
    props: {
      componentFqn: 'lasec-crm.LasecCRMClientLookupTable@1.0.0',
      componentProps: {},
    },
  },

  repCode: {
    'ui:widget': 'RepCodeFilter',
    'ui:options': {
      multiSelect: false,
      inputProps: {
        // variant: 'outline'
      },
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

  quoteType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'Normal', value: 'normal', label: 'Normal' },
        { key: 'contract', value: 'contract', label: 'Contract' },
        { key: 'tender', value: 'tender', label: 'Tender' },
        { key: 'budget', value: 'budget', label: 'Budget' },
      ],
    },
  },

  validDate: {
    'ui:widget': 'DateSelectorWidget',
  },
};


const LasecCRMQuoteHeaderForm: Reactory.IReactoryForm = {
  id: 'LasecCRMQuoteHeaderForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Quote Header',
  tags: ['CRM Quote Header'],
  registerAsComponent: true,
  name: 'LasecCRMQuoteHeaderForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql: graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    filterBy: "any_field",
    search: "",
    quotes: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
    { componentFqn: 'lasec-crm.RepCodeFilter@1.0.0', widget: 'RepCodeFilter' },
  ],
};

export default LasecCRMQuoteHeaderForm;
