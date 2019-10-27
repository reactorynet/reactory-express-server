export default {
  type: 'object',
  properties: {

    tabbedQuotes: {
      type: 'object',
      title: 'Tabbed Navigation',
      properties: {
        tabs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string'
              }
            }
          }
        }
      }
    }

  },
};
