import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  required: ['key', 'path', 'componentFqn'],
  properties: {
    id: {
      type: 'string',
      title: 'Route ID',
    },
    key: {
      type: 'string',
      title: 'Route Key',
    },
    path: {
      type: 'string',
      title: 'Path',
    },
    title: {
      type: 'string',
      title: 'Title',
    },
    componentFqn: {
      type: 'string',
      title: 'Component FQN',
    },
    exact: {
      type: 'boolean',
      title: 'Exact Match',
      default: true,
    },
    public: {
      type: 'boolean',
      title: 'Public Route',
      default: false,
    },
    roles: {
      type: 'array',
      title: 'Required Roles',
      items: {
        type: 'string',
      },
    },
    redirect: {
      type: 'string',
      title: 'Redirect Path',
    },
    componentProps: {
      type: 'object',
      title: 'Component Props',
      additionalProperties: true,
    },
  },
};

export default schema;
