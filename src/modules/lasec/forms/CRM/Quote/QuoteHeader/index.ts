import { Reactory } from '@reactory/server-core/types/reactory';
import { cloneDeep } from 'lodash';

const graphql: Reactory.IFormGraphDefinition = {
  mutation: {
    onChange: {
      name: "LasecUpdateQuote",
      text: `mutation LasecUpdateQuote($item_id: String, $quote_type: String, $rep_code: String, $client_id: String, $valid_until: String, $currency_code: String){
        LasecUpdateQuote(item_id: $item_id, quote_type: $quote_type, rep_code: $rep_code, client_id: $client_id, valid_until: $valid_until, currency_code: $currency_code) {
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
        'eventData.formData.currencyCode': 'currency_code',
      },
      throttle: 1500,
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
    currencyCode: {
      type: 'string',
      title: 'Currency Code'
    },
    client: {
      type: 'string',
      title: 'Client Name'
    },
    repCode: {
      type: "string",
      title: "Client Rep Code"
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
      quoteType: { xs: 12, sm: 6, md: 6, lg: 6 },
      style: { marginTop: '-16px' },
    },
    {
      repCode: { xs: 12, sm: 6, md: 6, lg: 6 },
      validDate: { xs: 12, sm: 6, md: 6, lg: 6 },
      style: { marginTop: '5px' },
    }
  ],

  client: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Client Name',        
      },
      inputProps:{
        readOnly: true,
      },      
    }
  },
  repCode: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        variant: 'outlined',
        placeholder: 'Client Rep Code',
        style: {
          marginTop: '1.3rem'
        }
      },
      inputProps:{
        readOnly: true,
      },      
    }
  },
  quoteType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      FormControl: {
        props: {
          style: {
            maxWidth: '400px'
          }
        }
      },      
      selectOptions: [
        { key: 'Normal', value: 'Normal', label: 'Normal' },
        { key: 'Contract', value: 'Contract', label: 'Contract' },
        { key: 'Tender', value: 'Tender', label: 'Tender' },
        { key: 'Budget', value: 'Budget', label: 'Budget' },
      ],
    }
  },
  validDate: {
    'ui:widget': 'DateSelectorWidget',
    'ui:options': {
      variant: 'outlined',
      typography: {
        variant: 'subtitle1',        
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
    // { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
    { componentFqn: 'lasec-crm.RepCodeFilter@1.0.0', widget: 'RepCodeFilter' },
    { componentFqn: 'lasec-crm.CustomerFilter@1.0.0', widget: 'CustomerFilter' },
  ],
};

export default LasecCRMQuoteHeaderForm;
