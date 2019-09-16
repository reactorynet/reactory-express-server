import { defaultFormProps } from '../../../../data/forms/defs';

export const UpdateQuoteStatusSchema = {
  type: 'object',  
  description: 'Update Status: [ ${props.formContext && props.formContext.formData && props.formContext.formData.quote_id ? props.formContext.formData.quote_id : props.formContext.query.quote_id} ]',
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
      default: '1',
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
    timeline: {
      type: 'array',      
      items: {
        type: 'object',
        properties: {
          id : {
            type: 'string',
            title: 'id', 
          },
          who: {
            type: 'string',
            title: 'Who'
          },
          what: {
            type: 'string',
            title: 'What',            
          },
          when: {
            type: 'string',
            format: 'date',
            title: 'when', 
          },
          notes: {
            type: 'string',
            title: 'Subject', 
          },
          content: {
            type: 'string',
            title: 'Content'            
          },
          via: {
            type: 'string',
            title: 'via'
          }
        }
      }
    },
  },
};

const graphql = {
  query: {
    name: 'QuoteStatusHistory',
    text: `query LasecGetQuoteById($quote_id: String!){
      LasecGetQuoteById(quote_id: $quote_id){
        id
        statusGroup
        status
        customer {
          id
          fullName
        }
        company {
           id
           tradingName
        }                        
        timeline {
          id
          who {
            id
            firstName
            lastName
          }
          what
          when
          notes    
          via      
        }
      }
    }`,
    variables: {
      'formData.id': 'quote_id',
    },
    resultMap: {
      id: 'id',

    },
    edit: false,
    new: true,
  },
  mutation: {
    new: {
      name: 'LasecUpdateQuoteStatus',
      text: `mutation LasecUpdateQuoteStatus($quote_id: String!, $input: LasecQuoteStatusUpdate){
        LasecUpdateQuoteStatus(quote_id: $quote_id, input: $input){
          id                                    
        }
      }`,
      objectMap: true,
      variables: {
        'formData.id': 'quote_id',
        'formData.status' : 'input.status',
        'formData.nextAction': 'input.nextAction',
        'formData.reason': 'input.reason',
        'formData.reminder': 'input.reminder',
        'formData.note': 'input.note'
      },
      options: {
        refetchQueries: [],
      },
      onSuccessMethod: 'event:UpdateQuoteStatus_onMutationSuccess',
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
  graphql,
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
      {
        timeline: {
          lg: 8, md: 12, sm: 12, xs: 12,
        }
      }
    ],
    customer: {
      'ui:widget': 'LabelWidget',
    },
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
          predicate: { group: '1' },
        },
        steps: [
          {
            group: '1', groupTitle: 'Draft', key: '1-1', value: '1-1', label: 'Pending Submission', step: 0,
          },
          {
            group: '1', groupTitle: 'Draft', key: '1-2', value: '1-2', label: 'Awaiting Approval', step: 1,
          },
          {
            group: '1', groupTitle: 'Draft', key: '1-3', value: '1-3', label: 'Approved', step: 2,
          },
          {
            group: '1', groupTitle: 'Draft', key: '1-4', value: '1-4', label: 'Declined', step: 3,
          },
          {
            group: '2', groupTitle: 'Open', key: '2-1', value: '2-1', label: 'Quote Submitted', step: 1,
          },
          {
            group: '2', groupTitle: 'Open', key: '2-2', value: '2-2', label: 'Under Assessment', step: 2,
          },
          {
            group: '2', groupTitle: 'Open', key: '2-3', value: '2-3', label: 'Budget Timeline', step: 3,
          },
          {
            group: '2', groupTitle: 'Open', key: '2-4', value: '2-4', label: 'Pricing Negotiation', step: 4,
          },
          {
            group: '2', groupTitle: 'Open', key: '2-5', value: '2-5', label: 'Awaiting Purchase Order', step: 5,
          },
          {
            group: '2', groupTitle: 'Open', key: '2-6', value: '2-6', label: 'Purchase Order Received', step: 6,
          },
          {
            group: '3', groupTitle: 'Accepted', key: '3-2', value: '3-2', label: 'Accepted Fully', step: 1,
          },
          {
            group: '3', groupTitle: 'Accepted', key: '3-3', value: '3-3', label: 'Partially Accepted', step: 2,
          },
          {
            group: '3', groupTitle: 'Accepted', key: '3-4', value: '3-4', label: 'Job Card', step: 3,
          },
          {
            group: '4', groupTitle: 'Draft', key: '4-2', value: '4-2', label: 'Lost - Price', step: 1,
          },
          {
            group: '4', groupTitle: 'Draft', key: '4-3', value: '4-3', label: 'Lost - Funds', step: 2,
          },
          {
            group: '4', groupTitle: 'Draft', key: '4-4', value: '4-4', label: 'Lost - No Stock', step: 3,
          },
          {
            group: '4', groupTitle: 'Draft', key: '4-5', value: '4-5', label: 'Lost - No Info', step: 4,
          },
          {
            group: '4', groupTitle: 'Draft', key: '4-6', value: '4-6', label: 'Lost - Lead Time', step: 5,
          },
          {
            group: '4', groupTitle: 'Draft', key: '4-7', value: '4-7', label: 'Other (specify)', step: 6,
          },
          {
            group: '5', groupTitle: 'Draft', key: '5-2', value: '5-2', label: 'Expired - Awaiting Feedback', step: 1
          },
          {
            group: '5', groupTitle: 'Draft', key: '5-3', value: '5-3', label: 'Expired - Awaiting Budget', step: 2
          }
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
    timeline: {
      'ui:widget': 'MaterialTable',
      'ui:options': {
        columns: [
          { title: 'via', field: 'via' },
          { title: 'What', field: 'what'},          
          { title: 'When', field: 'when' },
          { title: 'Who', field: 'who' },
          { title: 'Summary', field: 'notes' },          
        ],
        options: {
          grouping: true,
        },
        title: 'Quote Timeline',
      }
    },
  },
};
