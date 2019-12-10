export default {
  type: 'object',
  title: '',
  properties: {
    id: {
      title: 'Id',
      type: 'string',
    },
    code: {
      title: 'Code',
      type: 'string',
    },
    who: {
      title: 'Reps/Users',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          firstName: {
            type: 'string',
          },
          lastName: {
            type: 'string',
          }
        }
      }
    },
    quote: {
      title: 'Quote',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          title: 'Quote Id'
        },
        code: {
          type: 'string',
          title: 'Quote Code'
        }
      }
    },
    next: {
      title: 'Next Date',
      type: 'string',
    },
    importance: {
      title: 'Importance',
      type: 'string'
    },
    type: {
      title: 'Type',
      type: 'string'
    },
    text: {
      title: 'Text',
      type: 'string'
    },
  }
};
