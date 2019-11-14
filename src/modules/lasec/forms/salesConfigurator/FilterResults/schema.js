export default {
  type: 'object',
  title: 'Filter Results',
  properties: {
    testCard: {
      title: 'Card',
      type: 'object',
      properties: {
        header: {
          title: 'Header',
          type: 'object',
          properties: {
            cardTitle: {
              title: 'Title',
              type: 'string'
            },
            cardSubHeader: {
              title: 'Subheader',
              type: 'string'
            },
            avatar: {
              title: 'Avatar',
              type: 'string',
            }
          }
        },
        content: {
          title: 'Card Content',
          type: 'String'
        }
      }
    },
  }
};
