import moment from 'moment';

export default {

  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      quote: { lg: 12, md: 12, sm: 12, xs: 12 },
      // test: { lg: 12, md: 12, sm: 12, xs: 12 },
    },
    {
      who: { lg: 12, md: 12, sm: 12, xs: 12 },
    },
    {
      next: {
        lg: 4, md: 4, sm: 12, xs: 12,
      },
      type: {
        lg: 4, md: 4, sm: 12, xs: 12,
      },
      importance: {
        lg: 4, md: 4, sm: 12, xs: 12,
      },
    },
    {
      text: {
        md: 12, sm: 12, xs: 12,
      },
    },
  ],
  who: {
    'ui:widget': 'ChipLabelWidget',
    'ui:options': {
      title: 'Reps / Users',
      // userAvatar: true,
      // format: '${formContext.formData.who.firstName} ${formContext.formData.who.lastName}',
    }
  },
  quote: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formContext.formData.quote.code}',
      variant: 'subtitle1',
      title: 'Quote Code',
    }
  },
  next: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      format: 'DD MMM YYYY HH:mm',
      variant: 'subtitle1',
      title: 'Next Action Date',
    }
  },
  type: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formContext.formData.type}',
      variant: 'subtitle1',
      title: 'Action Type',
    }
  },
  importance: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formContext.formData.importance}',
      variant: 'subtitle1',
      title: 'Importance',
    }
  },
  text: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formContext.formData.text}',
      variant: 'subtitle1',
      title: 'Reminder',
    }
  },
};