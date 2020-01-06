
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

const uiSchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      customer: { lg: 6, md: 12, sm: 12, xs: 12 },
      statusName: { lg: 6, md: 12, sm: 12, xs: 12 },
    },
    {
      nextAction: {
        lg: 12, md: 12, sm: 12, xs: 12,
      },
      reason: {
        lg: 12, md: 12, sm: 12, xs: 12,
      },
    },
    {
      reminder: {
        md: 12, sm: 12, xs: 12,
      },
    },
    {
      note: {
        lg: 12, md: 12, sm: 12, xs: 12,
      },
    },
  ],
  code: {
    'ui:widget':'HiddenWidget',
  },
  customer: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formContext.formData.customer.fullName} @ ${formContext.formData.company.tradingName}',
      icon: 'account_circle',
      iconPosition: 'left',
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
    }
  },
  statusName: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formContext.query.quote_id} - ${formContext.formData.statusName}',
      title: 'Current Status',
      icon: 'visibility',
      iconPosition: 'left',
      iconProps: {
        marginTop: '4px',
        float: 'left'
      }
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
          group: 'default', key: '0-follow-up-call', value: 'follow-up-call', label: 'Follow-up call', step: 0,
        },
        {
          group: 'default', key: '1-send-email', value: 'send-email', label: 'Send email', step: 1,
        },
        {
          group: 'default', key: '2-client-visit', value: 'client-visit', label: 'Client visit', step: 2,
        },
        {
          group: 'default', key: '3-other', value: 'other', label: 'Other', step: 3,
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
  reminder: {
    'ui:widget': 'StepperWidget',
    'ui:options': {
      filter: {
        predicate: { group: 'default' },
      },
      steps: [
        {
          group: 'default', key: '1-one-day', value: 1, label: '24 Hours', step: 1,
        },
        {
          group: 'default', key: '2-three-days', value: 3, label: '3 Days', step: 2,
        },
        {
          group: 'default', key: '3-seven-days', value: 7, label: '7 Days', step: 3,
        },
        {
          group: 'default', key: '4-seven-days', value: 13, label: '13 Days', step: 4,
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
};

export default uiSchema;

