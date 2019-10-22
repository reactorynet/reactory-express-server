export default {
  submitIcon: 'refresh',
  tabbedQuotes: {
    'ui:widget': 'TabbedNavWidget',
    'ui:options': {
      tabs: [
        {
          title: 'Recent',
          componentFqn: 'lasec-crm.QuotesList',
          componentProps: {
            filterType: 'recent'
          }
        },
        {
          title: 'By Client',
          componentFqn: 'lasec-crm.QuotesList',
          componentProps: {
            filterType: 'client'
          }
        },
        {
          title: 'By Status',
          componentFqn: 'lasec-crm.QuotesList',
          componentProps: {
            filterType: 'status'
          }
        }
      ]
    }
  },
};
