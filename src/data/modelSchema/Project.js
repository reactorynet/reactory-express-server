export default {
  title: 'Project',
  type: 'object',
  required: [
    'title',
  ],
  properties: {
    id: {
      type: 'string',
      title: 'id',
    },
    boards: {
      type: 'array',
      title: 'Boards',
      items: {
        type: 'string',
        title: 'Board',
      },
    },
    title: {
      type: 'string',
      title: 'Title',
    },
    description: {
      type: 'string',
      title: 'Description',
    },
    mileStones: {
      type: 'array',
      title: 'Mile Stones',
      items: {
        type: 'object',
        title: 'Mile Stone',
        properties: {
          title: {
            type: 'string',
            title: 'Title',
          },
          description: {
            type: 'string',
            title: 'Description',
          },
          dueDate: {
            type: 'string',
            format: 'date',
            title: 'Due Date',
          },
          tasks: {
            type: 'array',
            title: 'Associated Tasks',
            items: {
              type: 'string',
              title: 'Task Id',
            },
          },
        },
      },
    },
  },
};
