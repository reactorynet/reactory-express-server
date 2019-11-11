export default {
  type: 'object',
  properties: {
    filters: {
      type: 'array',
      title: 'Category Filters',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            title: 'Filter Id',
          },
          title: {
            type: 'string',
            title: 'Title',
          },
          key: {
            type: 'string',
            title: 'Key',
          },
          selectMultiple: {
            type: 'string',
            title: 'Select Multiple',
          }
        },
      },
    },
  },
};
