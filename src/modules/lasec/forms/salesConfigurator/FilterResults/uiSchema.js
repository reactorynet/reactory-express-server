export default {
  testCard: {
    'ui:widget': 'MaterialCardWidget',
    'ui:options': {
      component: {
        componentFqn: 'lasec-crm.QuotesList',
        componentProps: {
          query: {
            filterType: 'Recent'
          }
        },
      },
      actions: [
        {
          buttonType: 'button',
          buttonText: 'MORE INFO',
          buttonColor: 'default',
          actionType: '',
          actionHandler: ''
        },
        {
          buttonType: 'button',
          buttonText: 'ADD TO QUOTE',
          buttonColor: 'primary',
          actionType: '',
          actionHandler: ''
        },
      ]
    }
  },
  testList: {
    'ui:widget': 'MaterialGridListWidget',
  }
};
