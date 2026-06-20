/**
 * GraphQLQueryStep - Executes a GraphQL query against the Reactory server
 *
 * Config shape (from YAML `inputs` JSON):
 *   query:         "query { ... }"     (required — the GraphQL query string)
 *   variables:     { ... }             (optional — variables passed to the query)
 *   operationName: "OperationName"     (optional — name of the operation to execute)
 *
 * The step resolves the GraphQL executor via the Reactory context service
 * `core.ReactoryGraphServices@1.0.0`. If no direct GraphQL service is
 * available, falls back to an HTTP POST to the server's own /api endpoint.
 *
 * Output: { data, errors }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/**
 * Configuration interface for GraphQLQueryStep
 */
export interface GraphQLQueryStepConfig {
  /** The GraphQL query string */
  query: string;

  /** Variables to pass to the query */
  variables?: Record<string, any>;

  /** Operation name (when the query document contains multiple operations) */
  operationName?: string;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for executing GraphQL queries against the Reactory server
 */
export class GraphQLQueryStep extends BaseYamlStep {
  public readonly stepType = 'graphql_query';

  /**
   * Execute the GraphQL query step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const { query, variables = {}, operationName } = this.config as GraphQLQueryStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot execute GraphQL query',
        outputs: {},
        metadata: {},
      };
    }

    const resolvedQuery = this.resolveTemplate(query, context);
    const resolvedVariables = this.resolveParams(variables, context);
    const resolvedOperationName = operationName
      ? this.resolveTemplate(operationName, context)
      : undefined;

    context.logger.info(
      `Executing GraphQL query${resolvedOperationName ? ` (${resolvedOperationName})` : ''}`,
    );

    try {
      // Attempt to get the GraphQL service from the Reactory context
      let result: { data?: any; errors?: any[] } | undefined;

      try {
        const graphService = context.reactoryContext.getService(
          'core.ReactoryGraphServices@1.0.0',
        ) as any;

        if (graphService && typeof graphService.query === 'function') {
          result = await graphService.query({
            query: resolvedQuery,
            variables: resolvedVariables,
            operationName: resolvedOperationName,
          });
        }
      } catch {
        context.logger.debug(
          'GraphQL service not available via context, falling back to HTTP',
        );
      }

      // Fallback: HTTP POST to the server's own GraphQL endpoint
      if (!result) {
        result = await this.executeViaHttp(
          resolvedQuery,
          resolvedVariables,
          resolvedOperationName,
          context,
        );
      }

      const hasErrors = result.errors && result.errors.length > 0;

      if (hasErrors) {
        context.logger.warn(
          `GraphQL query returned ${result.errors!.length} error(s)`,
        );
      }

      return {
        success: !hasErrors,
        outputs: {
          data: result.data || null,
          errors: result.errors || [],
        },
        metadata: {
          operationName: resolvedOperationName || null,
          hasErrors,
          errorCount: result.errors?.length || 0,
        },
        ...(hasErrors
          ? { error: result.errors!.map((e: any) => e.message || String(e)).join('; ') }
          : {}),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`GraphQL query failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: { data: null, errors: [{ message }] },
        metadata: { operationName: resolvedOperationName || null },
      };
    }
  }

  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.query || typeof config.query !== 'string') {
      errors.push('query is required and must be a string containing a valid GraphQL query');
    } else if (!config.query.trim().startsWith('query') && !config.query.trim().startsWith('{')) {
      warnings.push(
        'query does not appear to start with "query" keyword or "{" — ensure it is a valid GraphQL query',
      );
    }

    if (config.variables && typeof config.variables !== 'object') {
      errors.push('variables must be an object');
    }

    if (config.operationName && typeof config.operationName !== 'string') {
      errors.push('operationName must be a string');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Execute the GraphQL query via an HTTP POST to the server's own endpoint
   * @param query - Resolved query string
   * @param variables - Resolved variables
   * @param operationName - Resolved operation name
   * @param context - Execution context
   * @returns GraphQL result
   */
  private async executeViaHttp(
    query: string,
    variables: Record<string, any>,
    operationName: string | undefined,
    context: StepExecutionContext,
  ): Promise<{ data?: any; errors?: any[] }> {
    const serverUrl =
      context.env.REACTORY_API_URI ||
      context.env.API_URI_ROOT ||
      'http://localhost:4000/api';
    const endpoint = `${serverUrl}/graphql`;

    context.logger.debug(`Executing GraphQL query via HTTP POST to ${endpoint}`);

    const body: Record<string, any> = { query, variables };
    if (operationName) {
      body.operationName = operationName;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Pass through auth token if available
    if (context.reactoryContext?.user?.token) {
      headers['Authorization'] = `Bearer ${context.reactoryContext.user.token}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `GraphQL HTTP request failed with status ${response.status}: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Deep-resolve template strings inside a params object
   * @param params - Parameters to resolve
   * @param context - Execution context
   * @returns Resolved parameters
   */
  private resolveParams(params: any, context: StepExecutionContext): any {
    if (typeof params === 'string') {
      return this.resolveTemplate(params, context);
    }
    if (Array.isArray(params)) {
      return params.map((p) => this.resolveParams(p, context));
    }
    if (params && typeof params === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveParams(value, context);
      }
      return resolved;
    }
    return params;
  }
}
