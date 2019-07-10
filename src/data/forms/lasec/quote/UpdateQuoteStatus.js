import { defaultFormProps } from '../../defs';

export const UpdateQuoteStatusSchema = {
  type: 'object',
  title: 'Update Quote Status',
  description: 'Please update status of quote: [ ${props.formContext && props.formContext.formData && props.formContext.formData.quote_id ? props.formContext.formData.quote_id : props.formContext.query.quote_id} ]',
  required: [
    'customer',
    'quoteStatus',
    'nextAction',
  ],
  properties: {
    id: {
      type: 'string',
      title: 'Quote Id',
      description: 'Quote Id',
    },
    customer: {
      type: 'string',
      title: 'Customer',
      description: 'Customer for quote',
    },
    statusGroup: {
      type: 'string',
      title: 'Status Group',
      description: 'Status Grouping',
      default: 'draft',
    },
    quoteStatus: {
      type: 'number',
      title: 'Quote Status',
      description: 'Current Quote Status',
    },
    nextActionGroup: {
      type: 'string',
      title: 'Status Group',
      description: 'Status Grouping',
      default: 'draft',
    },
    nextAction: {
      type: 'string',
      title: 'Next Action',
      description: 'Next action for the quote',
    },
    reminder: {
      type: 'number',
      title: 'Follow Up',
      description: 'Reminder',
    },
    reasonCodes: {
      type: 'array',
      title: 'Reason Codes',
      items: {
        type: 'string',
      },
    },
    reason: {
      type: 'string',
      title: 'Reason',
      description: 'End of the period for which to collate quote data',
    },
    note: {
      type: 'string',
      title: 'Note (Internal)',
      description: 'Leave a small note',
    },
    emails: {
      type: 'string',
      title: 'Emails related to Quote',
    },
  },
};

const graphql = {
  query: {
    name: 'QuoteStatusHistory',
    text: `query LasecQuoteTimeline($id: String!){
      QuoteById(id: $id){
        id
        status        
        notes
        content
        via
        reminder {
          id
          who {
            id
            firstName
            lastName
          }
          actioned
          result
          via
        }
      }
    }`,
    variables: {
      'formContext.quote_id': 'id',
    },
    resultMap: {
      id: 'id',

    },
    edit: true,
    new: false,
  },
  mutation: {
    new: {
      name: 'setDelegatesForSurvey',
      text: `mutation SetDelegatesForSurvey($id: String!, $delegates: [DelegateInput]){
        setDelegatesForSurvey(id: $id, delegates: $delegates){
          id                                    
        }
      }`,
      objectMap: true,
      variables: {
        'formContext.surveyId': 'id',
        'formData[].id': 'delegates.id',
        'formData[].delegate.id': 'delegates[].delegate',
        'formData[].launched': 'delegates[].launched',
        'formData[].complete': 'delegates[].complete',
        'formData[].removed': 'delegates[].removed',
      },
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'refresh',
    },
  },
};

const froalaOptions = {
  key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',
  // Set the load images request type.
  imageManagerLoadMethod: 'GET',
  fileUploadURL: '${formContext.api.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.api.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.api.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.api.CLIENT_KEY}',
    'x-client-pwd': '${formContext.api.CLIENT_PWD}',
  },
};

export const UpdateQuoteStatusForm = {
  id: 'UpdateQuoteStatus',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Update Quote Status',
  tags: ['Quote Status'],
  schema: UpdateQuoteStatusSchema,
  widgetMap: [
    {
      component: 'core.InboxComponent@1.0.0',
      widget: 'InboxComponent',
    },
  ],
  components: ['core.InboxComponent@1.0.0'],
  registerAsComponent: true,
  name: 'UpdateQuoteStatus',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        customer: { md: 6, sm: 12, xs: 12 },
        quoteStatus: { md: 6, sm: 12, xs: 12 },
      },
      {
        nextAction: {
          lg: 4, md: 6, sm: 12, xs: 12,
        },
        reason: {
          lg: 4, md: 6, sm: 12, xs: 12,
        },
        reasonCodes: {
          lg: 4, md: 6, sm: 12, xs: 12,
        },
        reminder: {
          md: 4, sm: 12, xs: 12,
        },
      },
      {
        note: {
          lg: 8, md: 12, sm: 12, xs: 12,
        },
      },
    ],
    reasonCodes: {
      'ui:widget': 'ChipArrayWidget',
      'ui:options': {
        container: 'core.BasicContainer',
        containerProps: {
          title: 'Reasons',
          style: {
            maxWidth: '100%',
            justifyContent: 'flex-end',
          },
        },
      },
    },
    quoteStatus: {
      'ui:widget': 'StepperWidget',
      'ui:options': {
        filter: {
          predicate: { group: 'draft' },
        },
        steps: [
          {
            group: 'draft', key: 'draft-pending-submission', value: 'draft-pending-submission', label: 'Pending Submission', step: 0,
          },
          {
            group: 'draft', key: 'draft-awaiting-approval', value: 'draft-awaiting-approval', label: 'Awaiting Approval', step: 1,
          },
          {
            group: 'draft', key: 'draft-approved', value: 'draft-approved', label: 'Approved', step: 2,
          },
          {
            group: 'draft', key: 'draft-decline', value: 'draft-declined', label: 'Declined', step: 3,
          },
          {
            group: 'open', key: 'open-quote-submitted', value: 'open-quote-submitted', label: 'Quote Submitted', step: 1,
          },
          {
            group: 'open', key: 'under-assessment', value: 'under-assessment', label: 'Under Assessment', step: 2,
          },
          {
            group: 'open', key: 'budget-timeline', value: 'budget-timeline', label: 'Budget Timeline', step: 3,
          },
          {
            group: 'open', key: 'pricing-negotiation', value: 'pricing-negotiation', label: 'Pricing Negotiation', step: 4,
          },
          {
            group: 'open', key: 'awaiting-po', value: 'awaiting-po', label: 'Awaiting Purchase Order', step: 5,
          },
          {
            group: 'open', key: 'po-received', value: 'po-received', label: 'Purchase Order Recevied', step: 6,
          },
          {
            group: 'accepted', key: 'accepted-fully', value: 'accepted-fully', label: 'Accepted Fully', step: 1,
          },
          {
            group: 'accepted', key: 'accepted-partially', value: 'accepted-partially', label: 'Partially Accepted', step: 2,
          },
          {
            group: 'accepted', key: 'accepted-jobcard', value: 'accepted-jobcard', label: 'Job Card', step: 3,
          },
          {
            group: 'lost', key: 'lost-price', value: 'lost-price', label: 'Lost - Price', step: 1,
          },
          {
            group: 'lost', key: 'lost-funds', value: 'lost-funds', label: 'Lost - Funds', step: 2,
          },
          {
            group: 'lost', key: 'lost-no-stock', value: 'lost-no-stock', label: 'Lost - No Stock', step: 3,
          },
          {
            group: 'lost', key: 'lost-no-info', value: 'lost-no-info', label: 'Lost - No Info', step: 4,
          },
          {
            group: 'lost', key: 'lost-lead-time', value: 'lost-lead-time', label: 'Lost - Lead Time', step: 5,
          },
          {
            group: 'lost', key: 'lost-other', value: 'lost-other', label: 'Other (specify)', step: 6,
          },
        ],
      },
    },
    reason: {
      'ui:widget': 'FroalaWidget',
      'ui:options': {
        froalaOptions,
      },
    },
    nextAction: {
      'ui:widget': 'StepperWidget',
      'ui:options': {
        filter: {
          predicate: { group: 'default' },
        },
        steps: [
          {
            group: 'default', key: 'follow-up-call', value: 'follow-up-call', label: 'Follow-up call', step: 0,
          },
          {
            group: 'default', key: 'send-email', value: 'send-email', label: 'Send email', step: 1,
          },
          {
            group: 'default', key: 'client-visit', value: 'client-visit', label: 'Client visit', step: 2,
          },
          {
            group: 'default', key: 'other', value: 'other', label: 'Other', step: 3,
          },
        ],
      },
    },
    reminder: {
      'ui:widget': 'StepperWidget',
      'ui:options': {
        filter: {
          predicate: { group: 'default' },
        },
        steps: [
          {
            group: 'default', key: 'one-day', value: 1, label: '24 Hours', step: 1,
          },
          {
            group: 'default', key: 'three-days', value: 3, label: '3 Days', step: 2,
          },
          {
            group: 'default', key: 'seven-days', value: 7, label: '7 Days', step: 3,
          },
          {
            group: 'default', key: 'seven-days', value: 13, label: '13 Days', step: 4,
          },
        ],
      },
    },
    note: {
      'ui:widget': 'FroalaWidget',
      'ui:options': {
        froalaOptions,
      },
    },
    emails: {
      'ui:widget': 'InboxComponent',
      'ui:options': {
        props: {
          via: 'microsoft',
          display: 'wide',
          search: 'Quote: ${props.formData}',
        },
      },
    },
  },
};
