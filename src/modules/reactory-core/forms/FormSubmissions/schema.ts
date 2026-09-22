import Reactory from '@reactorynet/reactory-core';

/**
 * The schema for the submission explorer. `fqn` identifies the form being
 * explored and is seeded from the route; everything under `filter` drives the
 * server side query and `submissions` holds the current page.
 */
const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Form Submissions',
  properties: {
    fqn: {
      type: 'string',
      title: 'Form',
    },
    filter: {
      type: 'object',
      title: 'Filter',
      properties: {
        from: {
          type: 'string',
          format: 'date',
          title: 'From',
        },
        to: {
          type: 'string',
          format: 'date',
          title: 'To',
        },
        userId: {
          type: 'string',
          title: 'Submitted by',
        },
        anonymous: {
          type: 'boolean',
          title: 'Anonymous only',
        },
        search: {
          type: 'string',
          title: 'Search data',
        },
        query: {
          type: 'string',
          title: 'Data query',
          description:
            'A JSON predicate evaluated inside each submission. ' +
            'e.g. { "and": [ { "path": "country", "op": "eq", "value": "ZA" } ] }',
        },
      },
    },
    submissions: {
      type: 'array',
      title: 'Submissions',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', title: 'Id' },
          fqn: { type: 'string', title: 'Form' },
          userId: { type: 'string', title: 'User id' },
          user: {
            type: 'object',
            title: 'Submitted by',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              avatar: { type: 'string' },
            },
          },
          formData: { type: 'object', title: 'Data' },
          ipAddress: { type: 'string', title: 'IP address' },
          createdAt: { type: 'string', title: 'Received' },
          updatedAt: { type: 'string', title: 'Updated' },
        },
      },
    },
  },
};

export default schema;
