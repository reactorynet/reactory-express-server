import { Reactory } from '@reactory/server-core/types/reactory';
import { cloneDeep } from 'lodash';

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    onChange: {
      name: "LasecUpdateQuote",
      text: `mutation LasecUpdateQuote($item_id: String, $quote_type: String, $rep_code: String, $client_id: String, $valid_until: Date){
        LasecUpdateQuote(item_id: $item_id, quote_type: $quote_type, rep_code: $rep_code, client_id: $client_id, valid_until: $valid_until) {
          success
          message
        }
      }`,      
      variables: {
        'eventData.formData.code': 'item_id',
        'eventData.formData.quoteType': 'quote_type',
        'eventData.formData.repCode': 'rep_code',
        'eventData.formData.client_id': 'client_id',
        'eventData.formData.validDate': 'valid_until',
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
      title: "Quote Valid Until"
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
      client: { xs: 12, sm: 6, md: 6, lg: 6 },      
      repCode: { xs: 12, sm: 6, md: 6, lg: 6 },      
      style: { marginTop: '-16px' },
    },
    {
      quoteType: { xs: 12, sm: 6, md: 6, lg: 6 },
      validDate: { xs: 12, sm: 6, md: 6, lg: 6 },
    }
  ],

  code: {},

  client: {
    "ui:widget": "LabelWidget",
    "ui:options": {
      format: '${formData}',
      title: 'Customer',
      variant: 'body2',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }        
  },
  repCode: {
    "ui:widget": "LabelWidget",
    "ui:options": {
      format: '${formData}',
      title: 'Rep Code',
      variant: 'body2',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }    
  },
  quoteType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      size: 'small',
      selectOptions: [
        { key: 'Normal', value: 'Normal', label: 'Normal' },
        { key: 'Contract', value: 'Contract', label: 'Contract' },
        { key: 'Tender', value: 'Tender', label: 'Tender' },
        { key: 'Budget', value: 'Budget', label: 'Budget' },
      ],
    },
  },
  validDate: {
    'ui:widget': 'DateSelectorWidget',
    'ui:options': {
      formControl: {
        variant: 'outlined',
        size: 'small'
      },
      picker: {
        variant: 'outlined'
      }
    }
  },
};

let internationalUiSchema = cloneDeep(uiSchema);
internationalUiSchema.quoteType['ui:options'].selectOptions.push({ key: 'cross-trade', value: 'cross-trade', label: 'Cross Trade' })


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
  uiSchemas: [
    {
      id: 'default',
      icon: 'local_offer',
      uiSchema,
      key: 'default',
      title: 'Local',
      description: 'Local and Education'
    },
    {
      id: 'international',
      icon: 'language',
      uiSchema,
      key: 'international',
      title: 'Local',
      description: 'Local and Education'
    }
  ],
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
    { componentFqn: 'lasec-crm.CustomerFilter@1.0.0', widget: 'CustomerFilter' },
  ],
};

export default LasecCRMQuoteHeaderForm;
