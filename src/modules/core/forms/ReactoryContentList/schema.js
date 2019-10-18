export default {
  type: 'object',
  title: 'Content List',
  properties: {
    contentList: {
      type: 'array',
      title: 'Content List',
      items: {
        type: 'object',
        title: 'Content Item Object',
        properties: {
          id: {
            type: 'string',
            title: 'Content Id'
          },
          primaryText: {
            type: 'string',
            title: 'Content Title'
          },
          secondaryText: {
            type: 'string',
            title: 'Last Updated'
          }
        }
      }
    }
  }
};
