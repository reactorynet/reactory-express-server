export default {  
  'ui:options': {
    showSubmit: false,
    container: "div",
    containerStyles: {
      marginTop: '-10px',
      marginLeft: '-8px',
      marginRight: '-8px'
    }
  },
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
                    icon: 'create',
                    enabled: true,
                    ordinal: 0,
                    eventHandler: 'toBeImplemented'
                  }, {
                    key: 'existing-quote',
                    title: 'Existing Quote',
                    clickAction: 'navigate',
                    icon: 'folder',
                    enabled: true,
                    ordinal: 1,
                    eventHandler: 'toBeImplemented'
                  }, {
                    key: 'search-procducts',
                    title: 'Search Products',
                    clickAction: 'navigate',
                    icon: 'search',
                    enabled: true,
                    ordinal: 2,
                    eventHandler: 'toBeImplemented'
                  }]
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
