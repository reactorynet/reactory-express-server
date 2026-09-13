import { queryGraph, mutateGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import Reactory from '@reactorynet/reactory-core';
import logger from '@reactory/server-core/logging';

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
