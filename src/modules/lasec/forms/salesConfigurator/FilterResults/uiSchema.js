export default {
  // testCard: {
    // 'ui:widget': 'MaterialCardWidget',
  //   'ui:options': {
  //     component: 'lasec-crm.QuotesList',
  //     componentProps: {
  //       query: {
  //         filterType: 'Recent'
  //       }
  //     },
  //     actions: [
  //       {
  //         buttonType: 'button',
  //         buttonText: 'MORE INFO',
  //         buttonColor: 'default',
  //         actionType: '',
  //         actionHandler: ''
  //       },
  //       {
  //         buttonType: 'button',
  //         buttonText: 'ADD TO QUOTE',
  //         buttonColor: 'primary',
  //         actionType: '',
  //         actionHandler: ''
  //       },
  //     ]
  //   }
  // },
  filterResultList: {
    'ui:widget': 'MaterialGridListWidget',
    'ui:options': {
      columns: { lg: 6, md: 4, sm: 1 },
      component: 'core.MaterialCardWidget@1.0.0',
      componentProps: {
        // component: 'lasec-crm.QuotesList',
        // componentProps: {
        //   query: {
        //     filterType: 'Recent'
        //   }
        // },
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
      },
    }
  }
};
