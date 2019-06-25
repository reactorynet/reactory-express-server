import { defaultFormProps } from '../../defs';

export const UpdateQuoteStatusSchema = {
  type: 'object',
  title: 'Update Quote Status',
  description: 'Please update the quote status',
  properties: {
    id: {
      type: 'String',
      title: 'Quote Id',
      description: 'Quote Id',
    },
    quoteStatus: {
      type: 'string',
      title: 'Quote Status',
      description: 'Current Quote Status',
    },
    nextAction: {
      type: 'string',
      title: 'Next Action',
      description: 'Next action for the quote',
    },
    reason: {
      type: 'string',
      title: 'Reason',
      description: 'End of the period for which to collate quote data',
    },
    reminder: {
      type: 'number',
      title: 'Reminder',
      description: 'Reminder',
    },
    note: {
      type: 'string',
      title: 'Note',
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
        timeline: {
          id
          what
          when
          who {
            id
            email
            avatar
            firstName
            lastName
          }
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
      'formContext.surveyId': 'surveyId',
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
    { component: 'core.InboxComponent@1.0.0', widget: 'InboxComponent' },
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
        quoteStatus: { md: 6 },
        nextAction: { md: 6 },
      },
      {
        reason: { md: 12 },
      },
      {
        reminder: { md: 12 },
      },
      {
        note: { md: 12 },
      },
    ],
    quoteStatus: {
      'ui:widget': 'SelectWidget',
      'ui:options': {
        selectOptions: [
          {
            group: 'draft', key: 'draft-pending-submission', value: 'draft-pending-submission', label: 'Pending Submission',
          },
          {
            group: 'draft', key: 'draft-awaiting-approval', value: 'draft-awaiting-approval', label: 'Awaiting Approval',
          },
          {
            group: 'draft', key: 'draft-approved', value: 'draft-approved', label: 'Approved',
          },
          {
            group: 'draft', key: 'draft-decline', value: 'draft-declined', label: 'Declined',
          },
          {
            group: 'open', key: 'open-quote-submitted', value: 'open-quote-submitted', label: 'Quote Submitted',
          },
          {
            group: 'open', key: 'under-assessment', value: 'under-assessment', label: 'Under Assessment',
          },
          {
            group: 'open', key: 'budget-timeline', value: 'budget-timeline', label: 'Budget Timeline',
          },
          {
            group: 'open', key: 'pricing-negotiation', value: 'pricing-negotiation', label: 'Pricing Negotiation',
          },
          {
            group: 'open', key: 'awaiting-po', value: 'awaiting-po', label: 'Awaiting Purchase Order',
          },
          {
            group: 'open', key: 'po-received', value: 'po-received', label: 'Purchase Order Recevied',
          },
          {
            group: 'accepted', key: 'accepted-fully', value: 'accepted-fully', label: 'Accepted Fully',
          },
          {
            group: 'accepted', key: 'accepted-partially', value: 'accepted-partially', label: 'Partially Accepted',
          },
          {
            group: 'accepted', key: 'accepted-jobcard', value: 'accepted-jobcard', label: 'Job Card',
          },
          {
            group: 'lost', key: 'lost-price', value: 'lost-price', label: 'Lost - Price',
          },
          {
            group: 'lost', key: 'lost-funds', value: 'lost-funds', label: 'Lost - Funds',
          },
          {
            group: 'lost', key: 'lost-no-stock', value: 'lost-no-stock', label: 'Lost - No Stock',
          },
          {
            group: 'lost', key: 'lost-no-info', value: 'lost-no-info', label: 'Lost - No Info',
          },
          {
            group: 'lost', key: 'lost-lead-time', value: 'lost-lead-time', label: 'Lost - Lead Time',
          },
          {
            group: 'lost', key: 'lost-other', value: 'lost-other', label: 'Other (specify)',
          },
        ],
      },
    },
    reminder: {
      'ui:widget': 'SliderWidget',
      'ui:options': {
        widget: 'SliderWidget',
      },
    },
    note: {
      'ui:widget': 'FroalaWidget',
      'ui:options': {
        froalaOptions: {
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
        },
      },
    },
    emails: {
      'ui:widget': 'InboxComponent',
      'ui:options': {
        props: {
          via: 'microsoft',
          display: 'wide',
        },
      },
    },
  },
};
