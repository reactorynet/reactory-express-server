import { Reactory } from '@reactory/server-core/types/reactory';
const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Client Id'
    },
    race: {
      type: 'string',
      title: 'Race'
    },
    age: {
      type: 'string',
      title: 'Age'
    },
    gender: {
      type: 'string',
      title: 'Gender'
    },
  }
};

export default schema;
