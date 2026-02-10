import type {
  Swagger2Spec,
  ParsedEndpoint,
  ParsedSpec,
  ParsedParameter,
  ParsedRequestBody,
  ParsedResponse,
  SpecParserOptions,
  ParameterObject,
  ResponseObject,
  SchemaObject,
  ReferenceObject,
  OperationObject,
} from './types';
import { SpecParser, SpecUtils } from './SpecParser';

/**
 * Swagger 2.0 Specification Generator
 * 
 * Parses Swagger 2.0 specifications and converts them to service endpoint definitions
 */
export class Swagger2Generator {
  private spec: Swagger2Spec;
  private options: SpecParserOptions;

  constructor(spec: Swagger2Spec, options: SpecParserOptions = {}) {
    this.spec = spec;
    this.options = {
      includeDeprecated: true,
      dereference: true,
      ...options,
    };
  }

  /**
   * Parse the Swagger 2.0 specification into service endpoint definitions
   */
  parse(): ParsedSpec {
    const endpoints: ParsedEndpoint[] = [];
    const schemas = SpecParser.getSchemas(this.spec);

    // Parse each path
    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      // Process each HTTP method
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
      
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        // Skip deprecated endpoints if configured
        if (operation.deprecated && !this.options.includeDeprecated) {
          continue;
        }

        // Filter by tags if specified
        if (this.options.filterTags && this.options.filterTags.length > 0) {
          if (!operation.tags || !operation.tags.some(tag => this.options.filterTags.includes(tag))) {
            continue;
          }
        }

        const endpoint = this.parseOperation(path, method, operation, pathItem.parameters);
        endpoints.push(endpoint);
      }
    }

    return {
      version: 'swagger-2',
      info: this.spec.info,
      baseUrl: this.options.baseUrl || SpecParser.getBaseURL(this.spec),
      endpoints,
      schemas,
      securitySchemes: this.spec.securityDefinitions,
    };
  }

  /**
   * Parse a single operation into an endpoint definition
   */
  private parseOperation(
    path: string,
    method: string,
    operation: OperationObject,
    pathParameters?: (ParameterObject | ReferenceObject)[]
  ): ParsedEndpoint {
    // Combine path-level and operation-level parameters
    const allParameters = [
      ...(pathParameters || []),
      ...(operation.parameters || []),
    ];

    const { parameters, bodyParam} = this.parseParameters(allParameters);
    const requestBody = bodyParam ? this.createRequestBodyFromParameter(bodyParam) : undefined;
    const responses = this.parseResponses(operation.responses);

    // Determine if authentication is required
    const authentication = !!(operation.security || this.spec.security);

    return {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      parameters,
      requestBody,
      responses,
      deprecated: operation.deprecated,
      authentication,
    };
  }

  /**
   * Parse operation parameters (Swagger 2.0 has body as a parameter)
   */
  private parseParameters(params: (ParameterObject | ReferenceObject)[]): { 
    parameters: ParsedParameter[];
    bodyParam?: ParameterObject;
  } {
    const parsed: ParsedParameter[] = [];
    let bodyParam: ParameterObject | undefined;

    for (const param of params) {
      let resolvedParam: ParameterObject;

      if ('$ref' in param) {
        // Resolve reference if dereference is enabled
        if (this.options.dereference) {
          const resolved = SpecParser.resolveRef(this.spec, param.$ref);
          if (!resolved) continue;
          resolvedParam = resolved;
        } else {
          continue;
        }
      } else {
        resolvedParam = param;
      }

      // In Swagger 2.0, body parameters are special
      if (resolvedParam.in === 'body') {
        bodyParam = resolvedParam;
      } else {
        parsed.push(this.parseParameter(resolvedParam));
      }
    }

    return { parameters: parsed, bodyParam };
  }

  /**
   * Parse a single parameter
   */
  private parseParameter(param: ParameterObject): ParsedParameter {
    let type = 'any';

    // Swagger 2.0 can have type directly on parameter
    if (param.type) {
      type = SpecUtils.mapTypeToTypeScript(param.type, param.format);
    } else if (param.schema) {
      if ('$ref' in param.schema) {
        if (this.options.dereference) {
          const resolved = SpecParser.resolveRef(this.spec, param.schema.$ref);
          if (resolved) {
            type = this.getTypeFromSchema(resolved as SchemaObject);
          }
        } else {
          type = SpecUtils.extractSchemaName(param.schema.$ref);
        }
      } else {
        type = this.getTypeFromSchema(param.schema as SchemaObject);
      }
    }

    return {
      name: param.name,
      in: param.in as any,
      type,
      required: param.required || false,
      description: param.description,
      schema: param.schema && !('$ref' in param.schema) ? param.schema : undefined,
      default: param.default,
      enum: param.enum,
    };
  }

  /**
   * Create request body from Swagger 2.0 body parameter
   */
  private createRequestBodyFromParameter(param: ParameterObject): ParsedRequestBody {
    let schema: SchemaObject | undefined;

    if (param.schema) {
      if ('$ref' in param.schema) {
        if (this.options.dereference) {
          const resolved = SpecParser.resolveRef(this.spec, param.schema.$ref);
          if (resolved) {
            schema = resolved as SchemaObject;
          }
        }
      } else {
        schema = param.schema as SchemaObject;
      }
    }

    // Swagger 2.0 uses consumes for content type
    const contentType = this.spec.consumes?.[0] || 'application/json';

    return {
      required: param.required || false,
      contentType,
      schema,
      description: param.description,
    };
  }

  /**
   * Parse responses (Swagger 2.0 format)
   */
  private parseResponses(responses: Record<string, ResponseObject | ReferenceObject>): Record<string, ParsedResponse> {
    const parsed: Record<string, ParsedResponse> = {};

    for (const [statusCode, response] of Object.entries(responses)) {
      if ('$ref' in response) {
        if (!this.options.dereference) continue;
        
        const resolved = SpecParser.resolveRef(this.spec, response.$ref);
        if (!resolved) continue;
        
        parsed[statusCode] = this.parseResponse(statusCode, resolved as ResponseObject);
      } else {
        parsed[statusCode] = this.parseResponse(statusCode, response);
      }
    }

    return parsed;
  }

  /**
   * Parse a single response (Swagger 2.0 format)
   */
  private parseResponse(statusCode: string, response: ResponseObject): ParsedResponse {
    let schema: SchemaObject | undefined;

    // In Swagger 2.0, schema is directly on the response
    if (response.schema) {
      if ('$ref' in response.schema) {
        if (this.options.dereference) {
          const resolved = SpecParser.resolveRef(this.spec, response.schema.$ref);
          if (resolved) {
            schema = resolved as SchemaObject;
          }
        }
      } else {
        schema = response.schema as SchemaObject;
      }
    }

    // Swagger 2.0 uses produces for content type
    const contentType = this.spec.produces?.[0] || 'application/json';

    return {
      statusCode,
      description: response.description,
      contentType,
      schema,
    };
  }

  /**
   * Get TypeScript type from schema
   */
  private getTypeFromSchema(schema: SchemaObject): string {
    if (schema.type) {
      return SpecUtils.mapTypeToTypeScript(schema.type, schema.format);
    }

    if (schema.allOf || schema.oneOf || schema.anyOf) {
      return 'any';
    }

    return 'any';
  }

  /**
   * Get all tags from the specification
   */
  getTags(): string[] {
    const tags = new Set<string>();

    for (const pathItem of Object.values(this.spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
      
      for (const method of methods) {
        const operation = pathItem[method];
        if (operation?.tags) {
          operation.tags.forEach(tag => tags.add(tag));
        }
      }
    }

    return Array.from(tags);
  }

  /**
   * Get statistics about the specification
   */
  getStats() {
    return {
      version: this.spec.swagger,
      title: this.spec.info.title,
      apiVersion: this.spec.info.version,
      endpointCount: SpecParser.countEndpoints(this.spec),
      schemaCount: Object.keys(SpecParser.getSchemas(this.spec)).length,
      tagCount: this.getTags().length,
      host: this.spec.host,
      basePath: this.spec.basePath,
    };
  }
}
