export default {
  type: 'object',
  title: 'Create Category Filter',
  properties: {
    id: {
      type: 'string',
      title: 'Id'
    },
    title: {
      type: 'string',
      title: 'Filter Title'
    },
    filterOptions: {
      type: 'array',
      title: 'Filter Options',
      items: {
        type: 'object',
        title: 'Filter',
        properties: {
          key: {
            type: 'string'
          },
          text: {
            type: 'string'
          },
          value: {
            type: 'string'
          }
        }
      }
    },
    selectMultiple: {
      type: 'boolean',
      title: 'Select Multiple'
    }
  },
};
