import moment from 'moment';

export default {
  showSubmit: false,
  'ui:field': 'GridLayout',
  'ui:toolbar': {
    buttons: [
      {
        command: 'LasecMarkNextActionAsActioned',
        id: 'LasecMarkNextActionAsActioned',
        color: 'primary',
        icon: 'check_circle_outline',
        tooltip: 'Mark as Actioned',
        graphql: {
          mutation: {
            name: 'LasecMarkNextActionAsActioned',
            text: `
            mutation LasecMarkNextActionAsActioned($id: String!){
              LasecMarkNextActionAsActioned(id: $id){
                success
                message
              }
            }
            `,
            variables: {
              'id': 'id',
            },
            onSuccessMethod: 'refresh'
          }
        },
      }
    ]
  },
  'ui:grid-layout': [
    {
      formId: { lg: 12, md: 12, sm: 12, xs: 12 },
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
      actionType: {
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
  targetFormId: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.targetFormId}',
      variant: 'subtitle1',
      title: 'Previous Form Id',
    }
  },
  who: {
    'ui:widget': 'ChipLabelWidget',
    'ui:options': {
      title: 'Reps / Users',
      userAvatar: true,
      format: '${who.firstName} ${who.lastName}',
    }
  },
  quote: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.code}',
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
  actionType: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Action Type',
    }
  },
  importance: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Importance',
    }
  },
  text: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Reminder',
    }
  },
};
