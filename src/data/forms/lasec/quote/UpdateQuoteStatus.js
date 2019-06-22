import { defaultFormProps } from '../../defs';

export const UpdateQuoteStatusSchema = {
  type: 'object',
  title: 'Update Quote Status',
  description: 'Please update the quote status',
  properties: {
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
          { key: 'draft-pending-submission', value: 'draft-pending-submission', label: 'Pending Submission' },
          { key: 'draft-awaiting-approval', value: 'draft-awaiting-approval', label: 'Awaiting Approval' },
          { key: 'yesterday', value: 'yesterday', label: 'Approved' },
          { key: 'this-week', value: 'this-week', label: 'This Week' },
          { key: 'last-week', value: 'last-week', label: 'Last Week' },
          { key: 'this-month', value: 'this-month', label: 'This Month' },
          { key: 'last-month', value: 'last-month', label: 'Last Month' },
          { key: 'this-year', value: 'this-year', label: 'This Year' },
          { key: 'last-year', value: 'last-year', label: 'Last Year' },
          { key: 'custom', value: 'custom', label: 'Custom' },
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
          pluginsEnabled: [
            'align', 'charCounter', 'colors', 'draggable', 'embedly',
            'emoticons', 'fontAwesome', 'fontFamily', 'fontSize', 'image',
            'imageManager', 'inlineStyle', 'inlineClass', 'lineBreaker',
            'lineHeight', 'link', 'lists', 'paragraphFormat', 'paragraphStyle',
            'quickInsert', 'quote', 'save', 'table', 'url', 'video', 'wordPaste'],
          toolbarButtons: [
            ['fontSize', 'textColor', 'backgroundColor'],
            ['inlineClass', 'inlineStyle', 'clearFormatting', 'insertImage', 'table'],
            ['undo', 'redo'],
          ],
          quickInsertButtons: ['image', 'table'],
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
