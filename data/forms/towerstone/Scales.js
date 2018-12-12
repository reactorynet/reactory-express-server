

export default {
  type: 'object',
  title: 'Rating Scale',
  description: 'Rating scales used for leadership brand management',
  required: ['entries', 'title'],
  properties: {
    id: {
      type: 'string',
      title: 'Id - System',
    },
    title: {
      type: 'string',
      title: 'Scale Title',
    },
    entries: {
      type: 'array',
      title: 'Entries',
      items: {
        type: 'object',
        properties: {

        },
      },
    },
  },
};
