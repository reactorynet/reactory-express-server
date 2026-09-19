import { queryGraph, mutateGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';
import {
  getReactorySchema,
  getReactorySchemaCompiledAt,
} from '@reactory/server-core/graph/schemaRegistry';
import { introspectionFromSchema, printSchema } from 'graphql';

interface GraphQLQueryInput {
  query: string;
  variables?: any;
  operationName?: string;
}

interface GraphQLQueryParams {
  input: GraphQLQueryInput;
}

const executeGraphQLOperation = async (
  params: GraphQLQueryParams,
  context: Reactory.Server.IReactoryContext
) => {
  const startTime = Date.now();
  const { input } = params;
  const { query, variables } = input;

  let parsedVars = {};
  if (typeof variables === 'string' && variables.trim().length > 0) {
    try {
      parsedVars = JSON.parse(variables);
    } catch (e: any) {
      return {
        data: null,
        errors: [{ message: `Invalid JSON in variables: ${e.message}` }],
        extensions: null,
        success: false,
        executionTime: Date.now() - startTime,
      };
    }
  } else if (typeof variables === 'object' && variables !== null) {
    parsedVars = variables;
  }

  try {
    const isMutation = query.trim().startsWith('mutation');
    let response: any;
    if (isMutation) {
      response = await mutateGraph(query, parsedVars, undefined, context);
    } else {
      response = await queryGraph(query, parsedVars, undefined, context);
    }

    return {
      data: response?.data || null,
      errors: response?.errors || null,
      extensions: response?.extensions || null,
      success: !response?.errors || response.errors.length === 0,
      executionTime: Date.now() - startTime,
    };
  } catch (error: any) {
    logger.error('Error executing ReactoryGraphQLQuery', { error, query });
    return {
      data: null,
      errors: [{ message: error.message || 'Error executing GraphQL query' }],
      extensions: null,
      success: false,
      executionTime: Date.now() - startTime,
    };
  }
};

const ReactoryGraphQLResolver = {
  Query: {
    ReactoryGraphQLQuery: async (
      obj: any,
      params: GraphQLQueryParams,
      context: Reactory.Server.IReactoryContext
    ) => {
      return executeGraphQLOperation(params, context);
    },

    /**
     * Introspect the compiled schema.
     *
     * Read from the in-process schema rather than executing a `__schema`
     * operation: Apollo Server disables introspection outside development
     * (`introspection: NODE_ENV === 'development'` in ReactoryGraph.ts), so a
     * client-issued introspection query is unavailable in production. The same
     * gate applies to `ReactoryGraphQLQuery`, which reaches the graph over
     * HTTP, so it cannot be used as a workaround.
     *
     * The schema is identical for every caller and contains no user data, but
     * it is a complete map of the API surface, so access is role-gated to the
     * developer roles that the editor route already requires.
     */
    ReactoryGraphQLSchema: async (
      obj: any,
      params: any,
      context: Reactory.Server.IReactoryContext
    ) => {
      if (!context.hasRole('ADMIN') && !context.hasRole('DEVELOPER')) {
        throw new Error(
          'Unauthorized: GraphQL schema introspection requires the DEVELOPER or ADMIN role'
        );
      }

      const schema = getReactorySchema();
      if (!schema) {
        throw new Error(
          'The GraphQL schema is not available. It may not have compiled successfully on startup.'
        );
      }

      const typeMap = schema.getTypeMap();
      const typeCount = Object.keys(typeMap).filter(
        (name) => name.startsWith('__') === false
      ).length;

      return {
        // `buildClientSchema` on the client consumes this directly.
        introspection: introspectionFromSchema(schema),
        sdl: printSchema(schema),
        typeCount,
        compiledAt: getReactorySchemaCompiledAt(),
      };
    },
  },
  Mutation: {
    ReactoryGraphQLQuery: async (
      obj: any,
      params: GraphQLQueryParams,
      context: Reactory.Server.IReactoryContext
    ) => {
      return executeGraphQLOperation(params, context);
    },
  },
};

export default ReactoryGraphQLResolver;
