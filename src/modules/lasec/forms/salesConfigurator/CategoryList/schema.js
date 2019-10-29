export default {
  type: 'object',
  properties: {
    list: {
      type: 'array',
      title: 'Category List',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          name: {
            type: 'string'
          }
        }
      }
    },
    addMore: {
      type: 'string'
    }
  }
};
