export default {
  showSubmit: false,
  tabbedQuotes: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      tabs: [
        {
          title: 'Recent',
          componentFqn: 'lasec-crm.QuotesList',
          componentProps: {
            query: {
              filterType: 'Recent'
            }
          },
          additionalComponents: [
            {
              componentFqn: 'core.SlideOutLauncher',
              componentProps: {
                buttonVariant: 'SpeedDial',
                actions: [
                  {
                    key: 'new-quote',
                    title: 'New Quote',
                    clickAction: 'navigate',
                    icon: 'create'

                  }
                ]
              }
            }
          ]
        },
        {
          title: 'By Client',
          componentFqn: 'lasec-crm.QuotesList',
          componentProps: {
            query: {
              filterType: 'ByClient'
            }
          },
          additionalComponents: [
            {
              componentFqn: 'core.SlideOutLauncher',
              componentProps: {}
            }
          ]
        },
        {
          title: 'By Status',
          componentFqn: 'lasec-crm.QuotesList',
          componentProps: {
            query: {
              filterType: 'ByStatus'
            }
          },
          additionalComponents: [
            {
              componentFqn: 'core.SlideOutLauncher',
              componentProps: {}
            }
          ]
        }
      ]
    }
  },
};
