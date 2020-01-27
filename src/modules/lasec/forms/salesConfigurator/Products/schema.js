export default {
  type: 'object',
  properties: {
    list: {
      type: 'array',
      title: 'Product List',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          name: {
            type: 'string'
          },
          code: {
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
