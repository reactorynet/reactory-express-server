/**
 * GraphQLStep - Execute a GraphQL query or mutation
 *
 * Config shape (matches IGraphQLStepConfig):
 *   query:          string   (GraphQL query/mutation string)
 *   variables?:     object   (query variables)
 *   endpoint?:      string   (target GraphQL endpoint — defaults to self)
 *   headers?:       object   (additional HTTP headers)
 *   operationType?: 'query' | 'mutation'
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class GraphQLStep extends BaseYamlStep {
  public readonly stepType = 'graphql';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      query,
      variables = {},
      endpoint,
      headers = {},
      operationType = 'query',
    } = this.config;

    if (!query) {
      return {
        success: false,
        error: 'GraphQL step requires a query string',
        outputs: {},
        metadata: {}
      };
    }

    const resolvedQuery = this.resolveTemplate(String(query), context);
    const resolvedEndpoint = endpoint ? this.resolveTemplate(String(endpoint), context) : undefined;

    // Resolve template variables in variables object
    const resolvedVariables: Record<string, any> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        resolvedVariables[key] = this.resolveTemplate(value, context);
      } else {
        resolvedVariables[key] = value;
      }
    }

    context.logger.info(
      `GraphQL step "${this.id}": ${operationType}` +
      (resolvedEndpoint ? ` to ${resolvedEndpoint}` : ' (local)')
    );

    try {
      // If no external endpoint, execute against local Reactory GraphQL
      if (!resolvedEndpoint && context.reactoryContext) {
        const graphModule = context.reactoryContext.getService('core.GraphService@1.0.0') as any;
        if (graphModule && typeof graphModule.execute === 'function') {
          const result = await graphModule.execute(resolvedQuery, resolvedVariables);
          return {
            success: true,
            outputs: { data: result.data, errors: result.errors },
            metadata: { operationType, local: true }
          };
        }
      }

      // External endpoint — make HTTP request
      const targetUrl = resolvedEndpoint || 'http://localhost:4000/graph';
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ query: resolvedQuery, variables: resolvedVariables }),
      });

      const result = await response.json();

      return {
        success: !result.errors?.length,
        outputs: { data: result.data, errors: result.errors },
        metadata: { operationType, statusCode: response.status, local: false }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `GraphQL execution failed: ${message}`,
        outputs: {},
        metadata: { operationType }
      };
    }
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.query) {
      errors.push('GraphQL step requires a query string');
    }
    if (config.operationType && !['query', 'mutation'].includes(config.operationType)) {
      errors.push('operationType must be "query" or "mutation"');
    }
    return { valid: errors.length === 0, errors };
  }
}
