import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.IReactorySchema = {
  type: 'object',
  title: 'GraphQL Query Editor',
  description: 'Execute GraphQL queries and mutations against the Reactory GraphQL API',
  properties: {
    operationName: {
      type: 'string',
      title: 'Operation Name',
      description: 'Optional operation name',
      default: 'ApiStatus',
    },
    query: {
      type: 'string',
      title: 'GraphQL Document',
      description: 'Enter your GraphQL query or mutation document',
      default: `query ApiStatus {\n  apiStatus {\n    status\n    when\n    version\n  }\n}`,
    },
    variables: {
      type: 'string',
      title: 'Variables (JSON)',
      description: 'JSON object representing GraphQL variables',
      default: '{\n}',
    },
    data: {
      type: 'object',
      title: 'Query Results',
      description: 'Response returned from the GraphQL API',
    },
  },
  required: ['query'],
};

export default schema;
