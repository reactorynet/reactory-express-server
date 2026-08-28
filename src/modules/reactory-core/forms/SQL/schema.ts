import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.IReactorySchema = {
  type: 'object',
  title: 'SQL Query Editor',
  description: 'Execute SQL queries across connected relational databases',
  properties: {
    connectionId: {
      type: 'string',
      title: 'Database Connection',
      description: 'Select the database connection to query',
      default: 'reactory.postgres.connection',
    },
    commandText: {
      type: 'string',
      title: 'SQL Command',
      description: 'Enter your SQL query (e.g. SELECT * FROM information_schema.tables)',
      default: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';',
    },
    paging: {
      type: 'object',
      title: 'Pagination',
      properties: {
        page: {
          type: 'integer',
          title: 'Page',
          default: 1,
        },
        pageSize: {
          type: 'integer',
          title: 'Page Size',
          default: 50,
        },
        total: {
          type: 'integer',
          title: 'Total Rows',
        },
      },
    },
    data: {
      type: 'array',
      title: 'Query Results',
      items: {
        type: 'object',
      },
    },
  },
  required: ['connectionId', 'commandText'],
};

export default schema;
