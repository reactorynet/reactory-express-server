export default {
  type: 'object',
  title: 'Filters',
  properties: {
    filters: {
      type: 'array',
      title: 'Filter Grid',
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
